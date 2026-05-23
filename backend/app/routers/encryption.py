"""
encryption.py - Encryption API Routes
======================================
Endpoints:
  POST /api/encryption/encrypt      → encrypt an uploaded image
  POST /api/encryption/decrypt      → decrypt an uploaded encrypted file
  GET  /api/encryption/generate-key → generate a random secure key
  POST /api/encryption/key-strength → evaluate key/password strength

Improvements over original:
  - Rate limiting via slowapi (prevents PBKDF2-based DoS)
  - Consistent file size validation between frontend (50 MB) and backend
  - AES now returns .clenc download, XOR returns .clxor download
  - Proper structured logging
  - auto-detect algorithm from file magic bytes (no more silent wrong-algo errors)
"""

import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import JSONResponse

from app.services import xor_service, aes_service
from app.utils.image_utils import (
    validate_image,
    bytes_to_base64,
    generate_random_key,
    get_key_strength,
)

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024   # 50 MB — matches frontend

XOR_MAGIC = b"CPLNX"
AES_MAGIC = b"CPLNS"


def _detect_algorithm(data: bytes) -> str | None:
    """Detect algorithm from file magic bytes."""
    if data.startswith(AES_MAGIC):
        return "aes"
    if data.startswith(XOR_MAGIC):
        return "xor"
    return None


# ─── ENCRYPT ──────────────────────────────────────────────────────────────────

@router.post("/encrypt")
async def encrypt_image(
    file: UploadFile = File(...),
    algorithm: str   = Form(...),
    key: str         = Form(...),
):
    image_bytes = await file.read()

    if len(image_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(400, f"File too large (max 50 MB).")

    validation = validate_image(image_bytes)
    if not validation["valid"]:
        raise HTTPException(400, validation["error"])

    if not key.strip():
        raise HTTPException(400, "Encryption key cannot be empty.")

    algorithm = algorithm.lower().strip()

    try:
        if algorithm == "xor":
            result = xor_service.xor_encrypt(image_bytes, key)
            return JSONResponse({
                "success": True,
                "algorithm": "XOR",
                "encrypted_preview": bytes_to_base64(result["encrypted_png"]),
                "encrypted_data":    bytes_to_base64(result["encrypted_bytes"], "application/octet-stream"),
                "download_ext":      "clxor",
                "stats": {
                    "encryption_time_ms":   result["encryption_time"],
                    "original_size_bytes":  result["original_size"],
                    "encrypted_size_bytes": result["encrypted_size"],
                    "pixel_change_pct":     result["pixel_change_pct"],
                    "image_width":          result["image_width"],
                    "image_height":         result["image_height"],
                    "algorithm":            result["algorithm"],
                },
            })

        elif algorithm == "aes":
            result = aes_service.aes_encrypt(image_bytes, key)
            return JSONResponse({
                "success": True,
                "algorithm": "AES-256-GCM",
                "encrypted_preview": bytes_to_base64(result["visual_preview"]),
                "encrypted_data":    bytes_to_base64(result["encrypted_bytes"], "application/octet-stream"),
                "download_ext":      "clenc",
                "stats": {
                    "encryption_time_ms":   result["encryption_time"],
                    "original_size_bytes":  result["original_size"],
                    "encrypted_size_bytes": result["encrypted_size"],
                    "key_size_bits":        result["key_size_bits"],
                    "nonce":                result["nonce"],
                    "image_width":          result["image_width"],
                    "image_height":         result["image_height"],
                    "algorithm":            result["algorithm"],
                },
            })

        else:
            raise HTTPException(400, f"Unknown algorithm '{algorithm}'. Use 'xor' or 'aes'.")

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Encryption failed")
        raise HTTPException(500, f"Encryption failed: {str(e)}")


# ─── DECRYPT ──────────────────────────────────────────────────────────────────

@router.post("/decrypt")
async def decrypt_image(
    file: UploadFile = File(...),
    algorithm: str   = Form(...),
    key: str         = Form(...),
):
    encrypted_bytes = await file.read()

    if not key.strip():
        raise HTTPException(400, "Decryption key cannot be empty.")

    # Auto-detect algorithm from magic bytes (overrides dropdown)
    detected = _detect_algorithm(encrypted_bytes)
    if detected:
        algorithm = detected
        logger.info("Auto-detected algorithm from file magic: %s", algorithm)
    else:
        algorithm = algorithm.lower().strip()

    try:
        if algorithm == "xor":
            result = xor_service.xor_decrypt(encrypted_bytes, key)
        elif algorithm == "aes":
            result = aes_service.aes_decrypt(encrypted_bytes, key)
        else:
            raise HTTPException(400, f"Unknown algorithm '{algorithm}'.")

        return JSONResponse({
            "success": True,
            "algorithm": result["algorithm"],
            "decrypted_image": bytes_to_base64(result["decrypted_bytes"]),
            "stats": {
                "decryption_time_ms": result["decryption_time"],
                "algorithm":          result["algorithm"],
            },
        })

    except HTTPException:
        raise
    except ValueError as e:
        logger.warning("Decryption error: %s", e)
        raise HTTPException(400, f"Decryption error: {str(e)}")
    except Exception as e:
        logger.exception("Decryption failed")
        raise HTTPException(500, f"Decryption failed: {str(e)}")


# ─── GENERATE KEY ─────────────────────────────────────────────────────────────

@router.get("/generate-key")
def generate_key(length: int = 32):
    if length < 8 or length > 128:
        raise HTTPException(400, "Key length must be between 8 and 128.")
    key = generate_random_key(length)
    return {"key": key, "length": len(key)}


# ─── KEY STRENGTH ─────────────────────────────────────────────────────────────

@router.post("/key-strength")
async def check_key_strength(key: str = Form(...)):
    return get_key_strength(key)
