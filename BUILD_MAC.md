# Build Installer untuk Mac M1 (Apple Silicon)

## Persiapan

### 1. Konversi Icon ke Format ICNS

Sebelum build, Anda perlu mengonversi icon PNG ke format ICNS untuk Mac. Ada beberapa cara:

#### Opsi A: Menggunakan Online Converter
1. Buka https://cloudconvert.com/png-to-icns
2. Upload file `assets/kki-icon.png`
3. Convert dan download sebagai `kki-icon.icns`
4. Simpan di folder `assets/`

#### Opsi B: Menggunakan macOS (jika Anda punya akses ke Mac)
```bash
# Buat iconset folder
mkdir kki-icon.iconset

# Resize dan copy icon ke berbagai ukuran (gunakan sips atau ImageMagick)
sips -z 16 16     kki-icon.png --out kki-icon.iconset/icon_16x16.png
sips -z 32 32     kki-icon.png --out kki-icon.iconset/icon_16x16@2x.png
sips -z 32 32     kki-icon.png --out kki-icon.iconset/icon_32x32.png
sips -z 64 64     kki-icon.png --out kki-icon.iconset/icon_32x32@2x.png
sips -z 128 128   kki-icon.png --out kki-icon.iconset/icon_128x128.png
sips -z 256 256   kki-icon.png --out kki-icon.iconset/icon_128x128@2x.png
sips -z 256 256   kki-icon.png --out kki-icon.iconset/icon_256x256.png
sips -z 512 512   kki-icon.png --out kki-icon.iconset/icon_256x256@2x.png
sips -z 512 512   kki-icon.png --out kki-icon.iconset/icon_512x512.png
sips -z 1024 1024 kki-icon.png --out kki-icon.iconset/icon_512x512@2x.png

# Convert ke ICNS
iconutil -c icns kki-icon.iconset -o assets/kki-icon.icns
```

#### Opsi C: Menggunakan electron-icon-builder (Cross-platform)
```bash
npm install -g electron-icon-builder
electron-icon-builder --input=./assets/kki-icon.png --output=./assets --flatten
```

## Build Installer

### ⚠️ PENTING: Keterbatasan Platform

**electron-builder hanya bisa membuat installer Mac dari sistem macOS.**

Jika Anda menggunakan Windows/Linux, ada beberapa opsi:

#### **Opsi 1: GitHub Actions (Direkomendasikan - GRATIS)**

Gunakan GitHub Actions untuk build otomatis di cloud macOS:

1. Push code ke GitHub repository
2. Buat tag baru atau trigger manual:
```bash
git tag v1.0.0
git push origin v1.0.0
```
3. GitHub Actions akan otomatis build di macOS
4. Download hasil build dari tab "Actions" → "Artifacts"

File workflow sudah tersedia di `.github/workflows/build-mac.yml`

#### **Opsi 2: Menggunakan Mac (Lokal atau Remote)**

Jika Anda punya akses ke Mac M1:

### Prasyarat
- Node.js >= 16.0.0
- Yarn >= 1.10.0 < 2.0.0
- File `assets/kki-icon.icns` sudah ada
- **Sistem operasi: macOS**

### Langkah Build

1. Install dependencies:
```bash
npm install
```

2. Build aplikasi untuk Mac M1:
```bash
npm run package:mac
```

Atau jika menggunakan yarn:
```bash
yarn package:mac
```

### Output

Installer akan dibuat di folder `release/` dengan nama:
- `Ukom-1.0.0-mac-arm64.dmg` - DMG installer (untuk distribusi)
- `Ukom-1.0.0-mac-arm64.zip` - ZIP archive (untuk update otomatis)

## Catatan Penting

### Code Signing (Opsional tapi Direkomendasikan)

Untuk distribusi publik, Anda perlu code signing dengan Apple Developer Certificate:

1. Daftar Apple Developer Program ($99/tahun)
2. Buat Developer ID Application certificate
3. Tambahkan environment variables:
```bash
export CSC_LINK=/path/to/certificate.p12
export CSC_KEY_PASSWORD=your-certificate-password
```

4. Build dengan signing:
```bash
npm run package:mac
```

### Notarization (untuk macOS 10.15+)

Untuk macOS Catalina dan yang lebih baru, aplikasi perlu di-notarize:

1. Tambahkan Apple ID credentials:
```bash
export APPLEID=your-apple-id@email.com
export APPLEIDPASS=app-specific-password
```

2. Update `package.json` untuk menambahkan notarization:
```json
"mac": {
  "notarize": {
    "teamId": "YOUR_TEAM_ID"
  }
}
```

### Build Tanpa Code Signing

Jika Anda build tanpa code signing, pengguna Mac akan mendapat warning saat pertama kali membuka aplikasi. Mereka perlu:
1. Klik kanan pada aplikasi
2. Pilih "Open"
3. Klik "Open" pada dialog warning

## Troubleshooting

### Error: "Icon not found"
Pastikan file `assets/kki-icon.icns` sudah ada sebelum build.

### Error: "Code signing required"
Jika tidak punya certificate, tambahkan di `package.json`:
```json
"mac": {
  "identity": null
}
```

### Build di Windows/Linux
electron-builder dapat membuat installer Mac dari Windows/Linux, tapi:
- Tidak bisa code signing (perlu Mac)
- Tidak bisa notarization (perlu Mac)
- DMG mungkin tidak sempurna (lebih baik build di Mac)

## Arsitektur Lain

Untuk build universal binary (Intel + Apple Silicon):
```json
"mac": {
  "target": [
    {
      "target": "dmg",
      "arch": ["arm64", "x64"]
    }
  ]
}
```

Untuk Intel Mac saja:
```json
"mac": {
  "target": [
    {
      "target": "dmg",
      "arch": ["x64"]
    }
  ]
}
```
