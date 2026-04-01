# Auto Face Extraction Guide

## Overview

Sistem face verification sekarang mendukung **automatic extraction** dari folder `pics/`. Kamu tidak perlu lagi upload foto manual ke HTML tool - cukup taruh foto di folder `pics/` dan browser akan otomatis extract descriptors saat pertama kali dibuka.

## Cara Menggunakan

### 1. Persiapan Foto

Taruh semua foto wajah yang ingin dijadikan reference ke folder:
```
d:\ADVAN\Docs\GitHub\kki-electron\pics\
```

**Syarat foto:**
- Format: JPG, JPEG, PNG, GIF, BMP, WEBP
- Wajah harus terlihat jelas
- Pencahayaan cukup
- Tidak ada occlusion (tertutup masker/tangan)
- Satu wajah per foto (akan detect wajah pertama yang ditemukan)

### 2. Jalankan Browser

```bash
cd packages/shell
npm run start:dev-direct
```

### 3. Automatic Extraction

Saat browser pertama kali dibuka:

1. **Tekan Ctrl+Shift+F** untuk membuka camera overlay
2. Sistem akan otomatis:
   - Cek apakah sudah ada reference descriptors tersimpan
   - Jika belum ada, baca semua foto dari folder `pics/`
   - Extract face descriptor dari setiap foto
   - Simpan semua descriptors ke `userData/reference-descriptors.json`

**Progress ditampilkan di status overlay:**
```
Extracting face descriptors from photos...
Processing 1/10: WIN_20260401_16_51_04_Pro.jpg
Processing 2/10: WIN_20260401_16_51_07_Pro.jpg
...
✓ Loaded 10 reference photos
```

### 4. Verifikasi

Setelah extraction selesai, sistem siap untuk verifikasi:

- **Manual**: Klik "Capture & Verify" di overlay
- **Automatic**: Verifikasi otomatis jalan setiap 30 detik pertama, lalu 10 menit

**Hasil verifikasi:**
- Sistem akan membandingkan wajah kamu dengan **semua** reference descriptors
- Jika cocok dengan **salah satu** foto, verifikasi sukses
- Distance threshold: 0.6 (semakin rendah semakin mirip)

**Contoh log:**
```
FaceVerificationService: Verifying captured face against 10 references...
FaceVerificationService: Best match - File: WIN_20260401_16_51_10_Pro.jpg, Distance: 0.2522, Verified: true
```

## File Structure

```
kki-electron/
├── pics/                                    # Folder untuk reference photos
│   ├── WIN_20260401_16_51_04_Pro.jpg
│   ├── WIN_20260401_16_51_07_Pro.jpg
│   └── ...
├── packages/shell/
│   └── browser/
│       ├── services/
│       │   └── face-verification-service.js  # Service dengan multi-reference support
│       ├── handlers/
│       │   └── face-verification-handler.js  # IPC handlers untuk get photos & set references
│       ├── utils/
│       │   └── extract-descriptors-from-photos.js  # Utility untuk baca photos dari folder
│       └── ui/
│           └── face-verification-ui.js       # UI dengan auto-extraction logic
└── AppData/Local/shell/                     # userData directory
    └── reference-descriptors.json           # Saved descriptors (auto-generated)
```

## Technical Details

### Multi-Reference Verification

Sistem menggunakan **"any match" logic**:

```javascript
// Find best match among all references
let bestMatch = null
let minDistance = Infinity

for (const ref of referenceDescriptors) {
  const distance = calculateEuclideanDistance(ref.descriptor, capturedDescriptor)
  
  if (distance < minDistance) {
    minDistance = distance
    bestMatch = ref.fileName
  }
}

const verified = minDistance < SIMILARITY_THRESHOLD
```

### Descriptor Format

Descriptors disimpan sebagai JSON array:

```json
[
  {
    "fileName": "WIN_20260401_16_51_04_Pro.jpg",
    "descriptor": [0.123, -0.456, 0.789, ...]  // 128 dimensions
  },
  {
    "fileName": "WIN_20260401_16_51_07_Pro.jpg",
    "descriptor": [0.234, -0.567, 0.890, ...]
  }
]
```

### Extraction Process

1. **Main process** baca semua foto dari `pics/` sebagai base64
2. **Renderer process** receive base64 data via IPC
3. **face-api.js** extract descriptor dari setiap foto
4. **Descriptors** dikirim kembali ke main process untuk disimpan

## Troubleshooting

### Extraction tidak jalan

**Cek Console DevTools (F12):**
```javascript
// Cek apakah ada reference descriptors
window.faceVerification.hasReferencePhotos()
// Output: {success: true, hasReference: true, count: 10}
```

### Foto tidak terdetect

**Kemungkinan penyebab:**
- Wajah terlalu kecil/jauh
- Pencahayaan buruk
- Wajah tertutup (masker, tangan, rambut)
- Foto blur/tidak fokus

**Solusi:**
- Gunakan foto dengan wajah jelas dan pencahayaan baik
- Pastikan wajah menghadap kamera
- Coba foto dengan berbagai angle

### Force re-extraction

Jika ingin extract ulang dari folder `pics/`:

1. Hapus file saved descriptors:
   ```
   %LOCALAPPDATA%\shell\reference-descriptors.json
   ```

2. Restart browser dan tekan Ctrl+Shift+F

## Benefits

✅ **Tidak perlu upload manual** - Taruh foto di folder, langsung auto-extract  
✅ **Multiple references** - Support banyak foto untuk accuracy lebih baik  
✅ **Persistent** - Descriptors disimpan, tidak perlu extract ulang setiap restart  
✅ **Flexible** - Tambah/kurangi foto di folder `pics/` kapan saja  
✅ **Automatic verification** - Langsung bisa verify setelah extraction selesai  

## Next Steps

Setelah extraction selesai, sistem siap digunakan:

1. ✅ Reference descriptors loaded
2. ✅ Camera overlay berfungsi (Ctrl+Shift+F)
3. ✅ Manual verification (Capture & Verify button)
4. ✅ Automatic verification (30s initial, 10min interval)
5. ✅ Notifications untuk hasil verifikasi

Enjoy! 🎉
