# Face Verification Feature - Setup & Usage Guide

## Overview

Fitur Face Verification memungkinkan browser untuk secara otomatis memverifikasi identitas pengguna menggunakan kamera. Sistem akan:
- Mengambil foto pengguna setiap 30 detik pertama, kemudian setiap 10 menit
- Membandingkan foto yang diambil dengan foto referensi yang tersimpan
- Menampilkan notifikasi "Verifikasi Sukses" atau "Verifikasi Gagal"

## Teknologi yang Digunakan

- **face-api.js** - Face detection dan recognition
- **TensorFlow.js** - Machine learning backend
- **Canvas API** - Image processing
- **MediaDevices API** - Camera access

## Setup Instructions

### 1. Install Dependencies

Jalankan:

```bash
cd packages/shell
npm install
```

**Note**: Face-api.js models akan di-load otomatis dari CDN saat pertama kali digunakan. Tidak perlu download manual.

### 2. Build & Run

```bash
npm run start
```

## Cara Penggunaan

### Setup Reference Photo (Foto Referensi)

Sebelum verifikasi bisa berjalan, Anda perlu set foto referensi:

1. Buka browser
2. Tekan `Ctrl+Shift+F` untuk membuka camera overlay (atau akses manual)
3. Pastikan wajah terlihat jelas di kamera
4. Klik tombol **"Set as Reference Photo"**
5. Tunggu konfirmasi "Reference photo saved successfully!"

### Automatic Verification

Setelah reference photo di-set:

1. Verifikasi otomatis akan berjalan **30 detik** setelah browser dibuka
2. Kemudian akan berjalan setiap **10 menit**
3. Notifikasi akan muncul dengan hasil:
   - ✓ **Verifikasi Sukses** - Wajah cocok dengan reference
   - ✗ **Verifikasi Gagal** - Wajah tidak cocok

### Manual Verification

Untuk test manual:

1. Buka camera overlay
2. Klik **"Capture & Verify"**
3. Lihat hasil di status message

## Struktur File

```
packages/shell/browser/
├── services/
│   └── face-verification-service.js    # Main service logic
├── handlers/
│   └── face-verification-handler.js    # IPC handlers
├── preload/
│   └── face-verification-preload.js    # Preload script untuk renderer
├── ui/
│   ├── face-verification-overlay.html  # Camera UI
│   ├── face-verification-ui.js         # UI logic
│   └── inject-face-verification.js     # Injection helper
└── core/
    └── Browser.js                       # Integration point
```

## Configuration

### Mengubah Similarity Threshold

Edit `face-verification-service.js`:

```javascript
this.SIMILARITY_THRESHOLD = 0.6  // Default: 0.6
// Nilai lebih rendah = lebih strict
// Nilai lebih tinggi = lebih permissive
// Range: 0.0 - 1.0
```

### Mengubah Timing

Edit `face-verification-service.js`:

```javascript
this.INITIAL_DELAY = 30000      // 30 detik (dalam ms)
this.INTERVAL_DELAY = 600000    // 10 menit (dalam ms)
```

## Troubleshooting

### Camera tidak bisa diakses

**Problem**: "Failed to open camera: Permission denied"

**Solution**:
1. Pastikan browser memiliki permission untuk akses kamera
2. Check Windows Privacy Settings → Camera
3. Pastikan tidak ada aplikasi lain yang menggunakan kamera

### Models tidak bisa di-load

**Problem**: "Failed to load face detection models"

**Solution**:
1. Pastikan ada koneksi internet (models di-load dari CDN)
2. Check browser console untuk error details
3. Coba reload browser

### No face detected

**Problem**: "No face detected in captured photo"

**Solution**:
1. Pastikan pencahayaan cukup
2. Wajah harus menghadap kamera secara frontal
3. Jarak yang ideal: 50-100cm dari kamera
4. Hindari background yang terlalu ramai

### Verifikasi selalu gagal

**Problem**: Distance terlalu tinggi, selalu gagal verifikasi

**Solution**:
1. Set ulang reference photo dengan kondisi pencahayaan yang sama
2. Gunakan foto yang jelas dan berkualitas baik
3. Turunkan SIMILARITY_THRESHOLD jika terlalu strict
4. Pastikan tidak ada perubahan signifikan (kacamata, topi, dll)

## API Reference

### IPC Handlers (Main Process)

```javascript
// Initialize service
ipcRenderer.invoke('face-verification:initialize')

// Set reference photo
ipcRenderer.invoke('face-verification:set-reference', photoBuffer)

// Verify photo
ipcRenderer.invoke('face-verification:verify', photoBuffer)

// Check if has reference
ipcRenderer.invoke('face-verification:has-reference')

// Start periodic verification
ipcRenderer.invoke('face-verification:start-periodic')

// Stop periodic verification
ipcRenderer.invoke('face-verification:stop-periodic')
```

### Exposed API (Renderer Process)

```javascript
// Available via window.faceVerification
window.faceVerification.initialize()
window.faceVerification.setReference(photoBuffer)
window.faceVerification.verify(photoBuffer)
window.faceVerification.hasReference()
window.faceVerification.startPeriodic()
window.faceVerification.stopPeriodic()
```

## Security Considerations

1. **Reference Photo Storage**: Foto referensi disimpan di `userData` folder yang hanya bisa diakses oleh aplikasi
2. **Face Descriptor**: Hanya descriptor (128 float values) yang disimpan, bukan foto asli
3. **Camera Access**: Camera hanya aktif saat capture, tidak streaming terus-menerus
4. **Privacy**: Tidak ada data yang dikirim ke server external

## Performance

- **Model Loading**: ~2-3 detik saat startup
- **Face Detection**: ~100-300ms per foto
- **Face Comparison**: ~10-50ms
- **Memory Usage**: ~50-100MB untuk models
- **Camera Capture**: ~500ms-1s

## Future Improvements

Potential enhancements:
- [ ] Multi-face detection untuk mendeteksi orang lain
- [ ] Liveness detection untuk mencegah photo spoofing
- [ ] Face expression analysis
- [ ] Age/gender estimation
- [ ] Attendance tracking dengan timestamp
- [ ] Export verification logs

## Support

Jika ada masalah atau pertanyaan:
1. Check troubleshooting section di atas
2. Check console logs untuk error messages
3. Verify semua dependencies ter-install dengan benar
4. Pastikan models sudah di-download

## License

Face-api.js: MIT License
TensorFlow.js: Apache 2.0 License
