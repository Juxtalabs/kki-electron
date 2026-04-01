# Face Verification - Quick Start

## Setup (2 Steps)

### 1. Install Dependencies
```bash
cd packages/shell
npm install
```

### 2. Run Browser
```bash
npm start
```

**Note**: Face detection models akan di-load otomatis dari CDN saat pertama kali membuka camera.

## First Time Setup

1. Browser akan terbuka otomatis
2. Tekan **Ctrl+Shift+F** untuk membuka camera
3. Klik **"Set as Reference Photo"** untuk menyimpan foto referensi Anda
4. Tunggu konfirmasi sukses
5. Close camera overlay

## How It Works

- **30 detik pertama**: Verifikasi otomatis pertama kali
- **Setiap 10 menit**: Verifikasi otomatis berikutnya
- **Notifikasi**: Muncul otomatis dengan hasil verifikasi

## Manual Test

Tekan **Ctrl+Shift+F** → Klik **"Capture & Verify"**

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Camera tidak buka | Check Windows camera permissions |
| Models loading error | Pastikan ada koneksi internet |
| No face detected | Pastikan pencahayaan cukup & wajah frontal |
| Verifikasi gagal terus | Set ulang reference photo |

## Keyboard Shortcuts

- **Ctrl+Shift+F**: Open camera overlay
- **Ctrl+Shift+Q**: Exit browser (dengan password)

## File Locations

- **Reference Descriptor**: `%APPDATA%/KKI Browser/reference-descriptor.json`
- **Models**: Loaded from CDN (no local storage)

## Configuration

Edit `browser/services/face-verification-service.js`:

```javascript
// Timing
this.INITIAL_DELAY = 30000      // 30 seconds
this.INTERVAL_DELAY = 600000    // 10 minutes

// Threshold (0.0 - 1.0, lower = more strict)
this.SIMILARITY_THRESHOLD = 0.6
```

## Full Documentation

See: [FACE_VERIFICATION_GUIDE.md](../../FACE_VERIFICATION_GUIDE.md)
