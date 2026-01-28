# Panduan Build Installer Mac

Proyek ini telah dikonfigurasi untuk membuat installer untuk Mac Intel (x64) dan Mac Apple Silicon (arm64).

## Perintah Build

### Build untuk Mac Apple Silicon (M1/M2/M3)
```bash
npm run package:mac
```
Menghasilkan: `Ukom-{version}-mac-arm64.dmg` dan `Ukom-{version}-mac-arm64.zip`

### Build untuk Mac Intel (x64)
```bash
npm run package:mac-intel
```
Menghasilkan: `Ukom-{version}-mac-x64.dmg` dan `Ukom-{version}-mac-x64.zip`

### Build untuk Kedua Arsitektur (Universal)
```bash
npm run package:mac-universal
```
Menghasilkan kedua versi: Intel dan Apple Silicon

## Output

Semua installer akan tersimpan di folder `release/`

## Format File

- **DMG**: Installer drag-and-drop untuk Mac
- **ZIP**: Archive yang bisa diekstrak langsung

## Catatan

- Pastikan sudah menjalankan `npm install` sebelum build
- Build memerlukan macOS untuk membuat installer Mac
- Untuk distribusi, Anda mungkin perlu code signing (lihat `entitlements.mac.plist`)
