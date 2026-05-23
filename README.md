# CipherLens v2 — Image Encryption & Decryption System

A cybersecurity-themed web application for encrypting and decrypting images using **XOR** and **AES-256-GCM**. Built for academic demonstration with production-grade security practices.

## What's New in v2

| Area | Fix |
|------|-----|
| 🔐 Security | AES upgraded from CBC to **GCM** (authenticated encryption) |
| 🔐 Security | **Random salt per encryption** (was hardcoded — critical fix) |
| 🔐 Security | **EXIF/metadata stripped** before encrypting |
| 🔐 Security | Rate limiting on API endpoints (prevents DoS) |
| 🏗 Architecture | Proper binary file format with magic header (`.clenc` / `.clxor`) |
| 🏗 Architecture | Backend and frontend file size limits now match (50 MB) |
| 🏗 Architecture | Algorithm auto-detected from file magic bytes on decrypt |
| ✨ UX | **Separate Encrypt and Decrypt panels** (no more shared dropzone confusion) |
| ✨ UX | **Key confirmation field** on encrypt (prevents typo lock-out) |
| ✨ UX | Client-side file size check before upload |
| ✨ UX | XOR security warning shown prominently |
| ✨ UX | AES info panel explains authenticated encryption |
| 💻 Code | `URL.revokeObjectURL` called to prevent memory leaks |
| 💻 Code | Structured logging throughout backend |
| 💻 Code | Log capping fixed (was `slice(-19)`, now correctly capped at 20) |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | FastAPI (Python) + slowapi rate limiting |
| Crypto | PyCryptodome (AES-256-GCM) |
| Images | Pillow + NumPy |
| Charts | Recharts |

## File Formats

Encrypted files use a structured binary format:

**AES (`.clenc`)**:
```
[5 bytes]  Magic: CPLNS
[1 byte]   Version: 0x01
[1 byte]   Format name length
[N bytes]  Original format (e.g. JPEG)
[16 bytes] Random salt (PBKDF2)
[12 bytes] Random nonce (AES-GCM)
[16 bytes] GCM authentication tag
[rest]     Ciphertext
```

**XOR (`.clxor`)**:
```
[5 bytes]  Magic: CPLNX
[1 byte]   Version: 0x01
[1 byte]   Format name length
[N bytes]  Original format
[16 bytes] Random salt (PBKDF2)
[rest]     Encrypted PNG bytes
```

## Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173 · API docs: http://localhost:8000/docs

## Security Notes

- **XOR** is for **educational visualization only** — not secure for real use
- **AES-256-GCM** is real authenticated encryption (industry standard)
- PBKDF2-HMAC-SHA256 with 200,000 iterations for AES key derivation
- Wrong key or tampered file produces an explicit authentication error
- All image metadata (EXIF, GPS, device info) is stripped before encryption
