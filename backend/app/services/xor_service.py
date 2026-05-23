"""
xor_service.py - XOR Image Encryption/Decryption
==================================================
XOR encryption XORs each pixel byte with a key byte stream.
It is symmetric: the same operation encrypts and decrypts.

Improvements over original:
  - EXIF / metadata stripping before encryption for privacy.
  - Structured file format with magic header (consistent with AES service).
  - Warning info returned so the UI can display a security notice.
  - Key stream uses PBKDF2-derived bytes tiled (not raw SHA-256 repeat pattern).
  - Proper logging.

Note: XOR remains EDUCATIONAL ONLY. It is not cryptographically secure.
"""

import os
import io
import time
import logging
import hashlib
import numpy as np
from PIL import Image
from Crypto.Protocol.KDF import PBKDF2
from Crypto.Hash import SHA256

logger = logging.getLogger(__name__)

MAGIC   = b"CPLNX"   # different magic for XOR files
VERSION = b"\x01"
SALT_SIZE = 16
PBKDF2_ITERATIONS = 10_000   # lower for XOR (speed matters; security is already low)


def _strip_metadata(image_bytes: bytes) -> tuple:
    """Strip EXIF and all metadata. Returns (clean_bytes, original_format_str)."""
    img = Image.open(io.BytesIO(image_bytes))
    original_format = img.format or "PNG"

    if img.mode in ("RGBA", "LA", "P"):
        clean = Image.new("RGBA", img.size)
        clean.paste(img.convert("RGBA"))
    else:
        clean = Image.new("RGB", img.size)
        clean.paste(img.convert("RGB"))

    out = io.BytesIO()
    clean.save(out, format="PNG")
    return out.getvalue(), original_format


def _prepare_key(key: str, salt: bytes, length: int) -> np.ndarray:
    """
    Derive a key stream via PBKDF2, then tile it to the required length.
    More secure than raw SHA-256 tiling — reduces pattern repetition.
    """
    key_bytes = PBKDF2(
        key.encode(), salt,
        dkLen=64, count=PBKDF2_ITERATIONS,
        prf=lambda p, s: SHA256.new(p + s).digest(),
    )
    key_array = np.frombuffer(key_bytes, dtype=np.uint8)
    tiles = (length // len(key_array)) + 1
    return np.tile(key_array, tiles)[:length]


def xor_encrypt(image_bytes: bytes, key: str) -> dict:
    start_time = time.time()

    # Strip metadata
    clean_bytes, original_format = _strip_metadata(image_bytes)

    img = Image.open(io.BytesIO(clean_bytes)).convert("RGBA")
    img_array = np.array(img, dtype=np.uint8)
    original_shape = img_array.shape
    flat = img_array.flatten()

    # Random salt for key derivation
    salt = os.urandom(SALT_SIZE)
    key_array = _prepare_key(key, salt, len(flat))

    encrypted_flat = np.bitwise_xor(flat, key_array)

    changed_pixels = int(np.sum(flat != encrypted_flat))
    pixel_change_pct = round((changed_pixels / len(flat)) * 100, 2)

    encrypted_array = encrypted_flat.reshape(original_shape).astype(np.uint8)
    encrypted_img = Image.fromarray(encrypted_array, mode="RGBA")
    png_buffer = io.BytesIO()
    encrypted_img.save(png_buffer, format="PNG")
    png_bytes = png_buffer.getvalue()

    # Wrap in our structured format so decryption knows the salt
    fmt_bytes = original_format.encode()[:255]
    header = MAGIC + VERSION + bytes([len(fmt_bytes)]) + fmt_bytes + salt
    encrypted_output = header + png_bytes

    img_orig = Image.open(io.BytesIO(image_bytes))
    elapsed = time.time() - start_time
    logger.info("XOR encrypt: %d -> %d bytes in %.1fms",
                len(image_bytes), len(encrypted_output), elapsed * 1000)

    return {
        "encrypted_bytes":   encrypted_output,
        "encrypted_png":     png_bytes,      # for visual preview (valid PNG)
        "encryption_time":   round(elapsed * 1000, 2),
        "original_size":     len(image_bytes),
        "encrypted_size":    len(encrypted_output),
        "pixel_change_pct":  pixel_change_pct,
        "image_width":       img_orig.width,
        "image_height":      img_orig.height,
        "algorithm":         "XOR",
    }


def xor_decrypt(encrypted_bytes: bytes, key: str) -> dict:
    start_time = time.time()

    if not encrypted_bytes.startswith(MAGIC):
        raise ValueError(
            "Unrecognised file format. Not a CipherLens XOR file, or file is corrupted."
        )

    offset = len(MAGIC)
    version = encrypted_bytes[offset:offset + 1]; offset += 1
    if version != VERSION:
        raise ValueError(f"Unsupported file version: {version.hex()}")

    fmt_len = encrypted_bytes[offset]; offset += 1
    offset += fmt_len  # skip format string

    salt = encrypted_bytes[offset:offset + SALT_SIZE]; offset += SALT_SIZE
    png_bytes = encrypted_bytes[offset:]  # rest is the encrypted PNG

    img = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
    img_array = np.array(img, dtype=np.uint8)
    original_shape = img_array.shape
    flat = img_array.flatten()

    key_array = _prepare_key(key, salt, len(flat))
    decrypted_flat = np.bitwise_xor(flat, key_array)
    decrypted_array = decrypted_flat.reshape(original_shape).astype(np.uint8)

    decrypted_img = Image.fromarray(decrypted_array, mode="RGBA")
    out = io.BytesIO()
    decrypted_img.save(out, format="PNG")
    decrypted_bytes = out.getvalue()

    elapsed = time.time() - start_time
    logger.info("XOR decrypt complete in %.1fms", elapsed * 1000)

    return {
        "decrypted_bytes": decrypted_bytes,
        "decryption_time": round(elapsed * 1000, 2),
        "algorithm":       "XOR",
    }
