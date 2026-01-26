# Build Mac Installer dengan GitHub Actions

## Cara Menggunakan

Karena Anda menggunakan Windows, cara termudah untuk build installer Mac adalah menggunakan GitHub Actions (gratis untuk repository public).

### Langkah-langkah:

#### 1. Push Code ke GitHub
```bash
git add .
git commit -m "Add Mac build configuration"
git push origin main
```

#### 2. Trigger Build

**Cara A: Menggunakan Tag (Otomatis)**
```bash
git tag v1.0.0
git push origin v1.0.0
```

**Cara B: Manual Trigger**
1. Buka repository di GitHub
2. Klik tab **Actions**
3. Pilih workflow **"Build Mac Installer"**
4. Klik **"Run workflow"**
5. Pilih branch dan klik **"Run workflow"**

#### 3. Download Hasil Build

1. Tunggu workflow selesai (sekitar 5-10 menit)
2. Klik pada workflow run yang sudah selesai
3. Scroll ke bawah ke bagian **"Artifacts"**
4. Download **"mac-installer"**
5. Extract file zip, di dalamnya ada:
   - `Ukom-1.0.0-mac-arm64.dmg`
   - `Ukom-1.0.0-mac-arm64.zip`

## Troubleshooting

### Workflow Gagal?

Lihat log error di tab Actions untuk detail. Common issues:

1. **Dependencies error**: Pastikan `package.json` sudah benar
2. **Build error**: Pastikan kode bisa di-compile dengan `npm run build`
3. **Icon missing**: Pastikan `assets/kki-icon.icns` ada di repository

### Ingin Build Lokal?

Jika Anda punya akses ke Mac, lihat `BUILD_MAC.md` untuk instruksi build lokal.

## Konfigurasi Workflow

File workflow ada di: `.github/workflows/build-mac.yml`

Anda bisa edit file ini untuk:
- Mengubah trigger (misalnya setiap push ke main)
- Menambahkan build untuk Intel Mac (`x64`)
- Menambahkan code signing
- Upload ke release page otomatis

## Alternatif Lain

### Opsi 1: MacStadium / MacinCloud
Sewa Mac virtual untuk build (berbayar, ~$20-50/bulan)

### Opsi 2: Cross-compilation (Tidak Direkomendasikan)
Secara teknis bisa, tapi:
- Tidak bisa code signing
- Tidak bisa notarization
- DMG mungkin tidak sempurna
- Lebih ribet daripada GitHub Actions

**Rekomendasi: Gunakan GitHub Actions** - gratis, mudah, dan hasilnya sempurna!
