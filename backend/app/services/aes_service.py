"""
aes_service.py - AES-256-GCM Image Encryption/Decryption
==========================================================
Improvements over original:
  - AES-256-GCM: authenticated encryption (confidentiality + integrity).
    Wrong key or tampered file raises explicit error, not silent garbage.
  - Random salt per encryption (was hardcoded — major security fix).
  - Proper binary file format with magic header (not PNG steganography).
  - EXIF / metadata stripping before encryption for privacy.

File format for encrypted output (.clenc):
  [5 bytes]  Magic: b'CPLNS'
  [1 byte]   Version: 0x01
  [1 byte]   Original format length N
  [N bytes]  Original format string e.g. b'JPEG'
  [16 bytes] Random salt (PBKDF2)
  [12 bytes] Random nonce (AES-GCM)
  [16 bytes] GCM authentication tag
  [rest]     Ciphertext
"""

import os
import io
import time
import logging
import numpy as np
from PIL import Image
from Crypto.Cipher import AES
from Crypto.Protocol.KDF import PBKDF2
from Crypto.Hash import SHA256

logger = logging.getLogger(__name__)

AES_KEY_SIZE      = 32
AES_NONCE_SIZE    = 12
AES_TAG_SIZE      = 16
SALT_SIZE         = 16
PBKDF2_ITERATIONS = 200_000

MAGIC   = b"CPLNS"
VERSION = b"\x01"


def _derive_key(password: str, salt: bytes) -> bytes:
    return PBKDF2(
        password.encode(), salt,
        dkLen=AES_KEY_SIZE, count=PBKDF2_ITERATIONS,
        prf=lambda p, s: SHA256.new(p + s).digest(),
    )


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


def _generate_visual_scramble(image_bytes: bytes) -> bytes:
    """UI-only visual simulation of encryption (not real ciphertext)."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
    arr = np.array(img, dtype=np.uint8)
    h, w, c = arr.shape
    flat = arr.reshape(-1, c)
    rng = np.random.default_rng(seed=42)
    rng.shuffle(flat)
    noise = rng.integers(0, 255, flat.shape, dtype=np.uint8)
    scrambled = np.bitwise_xor(flat, noise).reshape(h, w, c).astype(np.uint8)
    out = io.BytesIO()
    Image.fromarray(scrambled, "RGBA").save(out, format="PNG")
    return out.getvalue()


def aes_encrypt(image_bytes: bytes, password: str) -> dict:
    start_time = time.time()

    clean_bytes, original_format = _strip_metadata(image_bytes)
    salt  = os.urandom(SALT_SIZE)
    nonce = os.urandom(AES_NONCE_SIZE)
    aes_key = _derive_key(password, salt)

    cipher = AES.new(aes_key, AES.MODE_GCM, nonce=nonce)
    ciphertext, tag = cipher.encrypt_and_digest(clean_bytes)

    fmt_bytes = original_format.encode()[:255]
    header = MAGIC + VERSION + bytes([len(fmt_bytes)]) + fmt_bytes + salt + nonce + tag
    encrypted_output = header + ciphertext
    visual_preview = _generate_visual_scramble(image_bytes)

    img = Image.open(io.BytesIO(image_bytes))
    elapsed = time.time() - start_time
    logger.info("AES-256-GCM encrypt: %d -> %d bytes in %.1fms",
                len(image_bytes), len(encrypted_output), elapsed * 1000)

    return {
        "encrypted_bytes":  encrypted_output,
        "visual_preview":   visual_preview,
        "encryption_time":  round(elapsed * 1000, 2),
        "original_size":    len(image_bytes),
        "encrypted_size":   len(encrypted_output),
        "key_size_bits":    AES_KEY_SIZE * 8,
        "nonce":            nonce.hex(),
        "image_width":      img.width,
        "image_height":     img.height,
        "algorithm":        "AES-256-GCM",
    }


def aes_decrypt(encrypted_bytes: bytes, password: str) -> dict:
    start_time = time.time()

    if not encrypted_bytes.startswith(MAGIC):
        raise ValueError(
            "Unrecognised file format. Not a CipherLens file, or file is corrupted."
        )

    offset = len(MAGIC)
    version = encrypted_bytes[offset:offset + 1]; offset += 1
    if version != VERSION:
        raise ValueError(f"Unsupported file version: {version.hex()}")

    fmt_len = encrypted_bytes[offset]; offset += 1
    offset += fmt_len  # skip stored format string

    salt  = encrypted_bytes[offset:offset + SALT_SIZE];     offset += SALT_SIZE
    nonce = encrypted_bytes[offset:offset + AES_NONCE_SIZE]; offset += AES_NONCE_SIZE
    tag   = encrypted_bytes[offset:offset + AES_TAG_SIZE];   offset += AES_TAG_SIZE
    ciphertext = encrypted_bytes[offset:]

    aes_key = _derive_key(password, salt)
    cipher = AES.new(aes_key, AES.MODE_GCM, nonce=nonce)
    try:
        image_bytes = cipher.decrypt_and_verify(ciphertext, tag)
    except (ValueError, KeyError):
        raise ValueError(
            "Authentication failed — wrong key or file has been tampered with."
        )

    elapsed = time.time() - start_time
    logger.info("AES-256-GCM decrypt complete in %.1fms", elapsed * 1000)

    return {
        "decrypted_bytes": image_bytes,
        "decryption_time": round(elapsed * 1000, 2),
        "algorithm":       "AES-256-GCM",
    }
