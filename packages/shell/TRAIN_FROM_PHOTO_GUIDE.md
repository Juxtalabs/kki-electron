# Train Face dari Foto Sample - Panduan

## 🎯 Overview

Anda bisa menggunakan foto yang sudah ada (pas foto, foto KTP, dll) sebagai reference untuk face verification, tanpa perlu capture langsung dari kamera.

## 📋 Langkah-langkah

### 1. Buka Tool Training

Buka file HTML tool di browser biasa (Chrome, Firefox, dll):

```
d:\ADVAN\Docs\GitHub\kki-electron\packages\shell\scripts\train-from-photo.html
```

**Cara buka:**
- Double-click file tersebut, atau
- Drag & drop ke browser window

### 2. Upload Foto Sample

- Click area upload atau drag & drop foto
- Foto yang bagus: **frontal, pencahayaan baik, wajah jelas**
- Format: JPG, PNG, JPEG

### 3. Extract Descriptor

- Tunggu models loading selesai (dari CDN)
- Click tombol **"Extract Face Descriptor"**
- Tunggu proses face detection
- Descriptor akan muncul di output box

### 4. Copy Descriptor

- Click tombol **"Copy Descriptor to Clipboard"**
- Descriptor sudah tersimpan di clipboard

### 5. Set ke Browser

Ada 2 cara:

#### Cara A: Via Browser Console (Recommended)

1. Buka KKI Browser yang sedang running
2. Buka Developer Tools (F12)
3. Paste di console:

```javascript
window.faceVerification.setReference([...descriptor array...])
```

4. Tekan Enter
5. Tunggu konfirmasi "Reference descriptor saved"

#### Cara B: Via Camera Overlay

1. Tekan `Ctrl+Shift+F` di browser
2. Buka console (F12)
3. Paste command yang sama
4. Close camera overlay

## ✅ Verifikasi

Setelah reference di-set, test dengan:

1. **Manual test**: Tekan `Ctrl+Shift+F` → Click "Capture & Verify"
2. **Auto test**: Tunggu 30 detik, verifikasi otomatis akan jalan

## 🔧 Troubleshooting

### "No face detected in photo"

**Solusi:**
- Gunakan foto yang lebih jelas
- Pastikan wajah frontal (tidak miring)
- Pencahayaan harus cukup
- Hindari foto dengan banyak orang (hanya 1 wajah)

### "Failed to load models"

**Solusi:**
- Pastikan ada koneksi internet
- Refresh halaman
- Coba browser lain

### Descriptor tidak bisa di-copy

**Solusi:**
- Copy manual dari output box
- Atau screenshot dan ketik manual

## 📝 Contoh Descriptor

Descriptor adalah array 128 angka float, contoh:

```javascript
[0.123, -0.456, 0.789, ..., 0.321]
```

## 💡 Tips

1. **Gunakan foto berkualitas baik** - Semakin jelas foto, semakin akurat verifikasi
2. **Kondisi serupa** - Gunakan foto dengan kondisi pencahayaan yang mirip dengan saat verifikasi
3. **Tanpa aksesoris berlebihan** - Hindari topi, masker, kacamata hitam
4. **Update berkala** - Jika penampilan berubah signifikan, update reference photo

## 🚀 Workflow Lengkap

```
1. Siapkan foto sample (pas foto, dll)
   ↓
2. Buka train-from-photo.html
   ↓
3. Upload foto → Extract descriptor
   ↓
4. Copy descriptor
   ↓
5. Buka KKI Browser
   ↓
6. Open console (F12)
   ↓
7. Paste: window.faceVerification.setReference([...])
   ↓
8. Verifikasi otomatis akan jalan setiap 10 menit
```

## 📊 Perbandingan Metode

| Metode | Kelebihan | Kekurangan |
|--------|-----------|------------|
| **Dari Foto** | Bisa pakai foto existing, tidak perlu kamera | Perlu tool terpisah |
| **Dari Kamera** | Langsung di browser, real-time | Perlu kamera aktif |

## 🔐 Keamanan

- Descriptor (128 float) yang disimpan, **bukan foto asli**
- Tidak bisa reverse-engineer kembali ke foto
- Aman untuk disimpan di database

## ❓ FAQ

**Q: Apakah bisa pakai foto dari smartphone?**
A: Ya, transfer foto ke PC lalu upload.

**Q: Berapa ukuran foto yang ideal?**
A: Minimal 640x480px, maksimal tidak ada batasan.

**Q: Apakah bisa pakai foto hitam putih?**
A: Ya, bisa. Yang penting wajah terlihat jelas.

**Q: Berapa lama proses extract?**
A: 1-3 detik setelah models loaded.

**Q: Apakah perlu internet?**
A: Ya, untuk load models dari CDN (hanya sekali saat buka halaman).
