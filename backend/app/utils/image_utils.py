"""
image_utils.py - Image Validation and Helper Utilities
=======================================================
Utility functions for validating uploaded images, computing statistics,
and converting between different formats used throughout the app.
"""

import io
import base64
import secrets
import string
from PIL import Image

# Allowed image formats for upload
ALLOWED_FORMATS = {"PNG", "JPEG", "BMP"}
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp"}
MAX_FILE_SIZE_MB = 50  # Maximum upload size in megabytes


def validate_image(image_bytes: bytes) -> dict:
    """
    Validate that uploaded bytes represent a valid, supported image.

    Returns:
        dict with 'valid' (bool) and 'error' (str) or image info
    """
    # Check file size
    size_mb = len(image_bytes) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        return {"valid": False, "error": f"File too large: {size_mb:.1f}MB (max {MAX_FILE_SIZE_MB}MB)"}

    # Try to open with Pillow
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img.verify()  # Verify it's a real image (may close the stream)
        img = Image.open(io.BytesIO(image_bytes))  # Reopen after verify

        if img.format not in ALLOWED_FORMATS:
            return {"valid": False, "error": f"Format '{img.format}' not supported. Use PNG, JPG, or BMP."}

        return {
            "valid": True,
            "format": img.format,
            "width": img.width,
            "height": img.height,
            "mode": img.mode,
            "size_bytes": len(image_bytes),
            "size_kb": round(len(image_bytes) / 1024, 2),
        }
    except Exception as e:
        return {"valid": False, "error": f"Invalid image file: {str(e)}"}


def bytes_to_base64(data: bytes, mime_type: str = "image/png") -> str:
    """
    Convert raw bytes to a base64 data URL for sending to the frontend.
    The frontend can use this directly in <img src="..."> tags.
    """
    b64 = base64.b64encode(data).decode("utf-8")
    return f"data:{mime_type};base64,{b64}"


def generate_random_key(length: int = 32) -> str:
    """
    Generate a cryptographically secure random key string.

    Uses Python's secrets module (cryptographically secure RNG).
    The key contains uppercase, lowercase, digits, and safe symbols.
    """
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def calculate_entropy(key: str) -> float:
    """
    Calculate Shannon entropy of a key to estimate its strength.
    Higher entropy = stronger key. Max is log2(charset_size).

    Returns entropy in bits per character.
    """
    import math
    if not key:
        return 0.0

    # Count frequency of each character
    freq = {}
    for ch in key:
        freq[ch] = freq.get(ch, 0) + 1

    # Shannon entropy formula: H = -sum(p * log2(p))
    entropy = 0.0
    for count in freq.values():
        p = count / len(key)
        entropy -= p * math.log2(p)

    return round(entropy, 4)


def get_key_strength(key: str) -> dict:
    """
    Evaluate password/key strength and return a structured assessment.
    Used by the analytics/key-strength indicator.
    """
    score = 0
    details = []

    # Length check
    if len(key) >= 32:
        score += 30
        details.append("Excellent length (32+ chars)")
    elif len(key) >= 16:
        score += 20
        details.append("Good length (16+ chars)")
    elif len(key) >= 8:
        score += 10
        details.append("Minimum length (8+ chars)")
    else:
        details.append("Too short (< 8 chars)")

    # Character variety checks
    has_upper = any(c.isupper() for c in key)
    has_lower = any(c.islower() for c in key)
    has_digit = any(c.isdigit() for c in key)
    has_symbol = any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in key)

    if has_upper:
        score += 15
        details.append("Has uppercase")
    if has_lower:
        score += 15
        details.append("Has lowercase")
    if has_digit:
        score += 20
        details.append("Has digits")
    if has_symbol:
        score += 20
        details.append("Has symbols")

    # Entropy check
    entropy = calculate_entropy(key)
    if entropy > 3.5:
        score += 10
        details.append(f"High entropy ({entropy:.2f} bits/char)")

    # Cap at 100
    score = min(score, 100)

    # Determine label
    if score >= 80:
        label = "Strong"
        color = "green"
    elif score >= 50:
        label = "Moderate"
        color = "yellow"
    else:
        label = "Weak"
        color = "red"

    return {
        "score": score,
        "label": label,
        "color": color,
        "entropy": entropy,
        "details": details,
    }
