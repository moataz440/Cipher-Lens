"""
analytics.py - Analytics & Benchmark API Routes
=================================================
These endpoints provide:
  - POST /api/analytics/benchmark  → run both XOR and AES on same image, compare
  - GET  /api/analytics/algorithms → info cards about each algorithm
"""

import io
import time
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse

from app.services import xor_service, aes_service
from app.utils.image_utils import validate_image, get_key_strength

router = APIRouter()


@router.post("/benchmark")
async def benchmark_algorithms(
    file: UploadFile = File(..., description="Image to benchmark with"),
    key: str = Form(..., description="Key to use for both algorithms"),
):
    """
    Run both XOR and AES encryption on the same image and return
    a side-by-side timing/stats comparison.
    """
    image_bytes = await file.read()

    validation = validate_image(image_bytes)
    if not validation["valid"]:
        raise HTTPException(status_code=400, detail=validation["error"])

    results = {}

    # ── XOR Benchmark ──────────────────────────────────────────────────────
    xor_result = xor_service.xor_encrypt(image_bytes, key)
    results["xor"] = {
        "algorithm": "XOR",
        "encryption_time_ms": xor_result["encryption_time"],
        "original_size_bytes": xor_result["original_size"],
        "encrypted_size_bytes": xor_result["encrypted_size"],
        "pixel_change_pct": xor_result["pixel_change_pct"],
        "security_level": "Low",
        "key_size_bits": "Variable (hashed to 256-bit)",
        "mode": "Stream cipher (symmetric)",
    }

    # ── AES Benchmark ──────────────────────────────────────────────────────
    aes_result = aes_service.aes_encrypt(image_bytes, key)
    results["aes"] = {
        "algorithm": "AES-256-GCM",
        "encryption_time_ms": aes_result["encryption_time"],
        "original_size_bytes": aes_result["original_size"],
        "encrypted_size_bytes": aes_result["encrypted_size"],
        "pixel_change_pct": None,  # AES output is not pixel-based
        "security_level": "Very High",
        "key_size_bits": 256,
        "mode": "Block cipher (GCM)",
        "nonce": aes_result.get("nonce", ""),
    }

    # ── Key Strength ───────────────────────────────────────────────────────
    key_strength = get_key_strength(key)

    return JSONResponse({
        "success": True,
        "image_info": {
            "width": xor_result["image_width"],
            "height": xor_result["image_height"],
            "original_size_bytes": xor_result["original_size"],
            "original_size_kb": round(xor_result["original_size"] / 1024, 2),
        },
        "results": results,
        "key_strength": key_strength,
    })


@router.get("/algorithms")
def get_algorithm_info():
    """
    Return educational information cards about XOR and AES algorithms.
    Used on the Dashboard and Analytics pages.
    """
    return {
        "algorithms": [
            {
                "name": "XOR Encryption",
                "short": "XOR",
                "complexity": "O(n)",
                "key_size": "Variable",
                "security": "Low",
                "speed": "Very Fast",
                "pros": [
                    "Extremely fast",
                    "Simple to implement",
                    "Output is a valid image",
                    "Easy to visualize",
                ],
                "cons": [
                    "Weak against known-plaintext attacks",
                    "Not suitable for production use",
                    "Vulnerable if key is short or repeated",
                ],
                "use_case": "Education & visualization",
                "description": (
                    "XOR encryption applies a bitwise XOR operation between each pixel byte "
                    "and a repeating key. It is symmetric — the same key and operation both "
                    "encrypts and decrypts. While fast and visually interesting, it is not "
                    "cryptographically secure for real-world use."
                ),
            },
            {
                "name": "AES-256 Encryption",
                "short": "AES",
                "complexity": "O(n)",
                "key_size": "256 bits",
                "security": "Very High",
                "speed": "Fast",
                "pros": [
                    "Industry-standard (FIPS 197)",
                    "256-bit key = 2^256 possible keys",
                    "GCM provides authenticated encryption with random nonce",
                    "Used in TLS, military, banking",
                ],
                "cons": [
                    "Output is not a valid image",
                    "Slightly slower than XOR",
                    "Requires careful key management",
                ],
                "use_case": "Real-world secure encryption",
                "description": (
                    "AES-256 in CBC mode encrypts data in 128-bit blocks using a 256-bit key "
                    "derived via PBKDF2. Each block's encryption depends on the previous block "
                    "(chaining), providing strong diffusion. With 2^256 possible keys, brute-force "
                    "is computationally infeasible."
                ),
            },
        ]
    }
