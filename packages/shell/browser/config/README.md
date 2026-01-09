# App Buttons Configuration

Sistem ini memungkinkan Anda untuk menambah, mengedit, dan mengelola tombol aplikasi di browser toolbar melalui file konfigurasi JSON.

## File Konfigurasi

File konfigurasi utama: `app-buttons.json`

## Struktur Konfigurasi

```json
{
  "appButtons": [
    {
      "id": "unique-app-id",
      "name": "App Name",
      "enabled": true,
      "style": {
        "backgroundColor": "#5865F2",
        "hoverColor": "#4752C4", 
        "activeColor": "#3C45A5",
        "textColor": "#ffffff"
      },
      "detection": {
        "type": "executable",
        "paths": [
          "%USERPROFILE%\\AppData\\Local\\App\\App.exe",
          "%PROGRAMFILES%\\App\\App.exe"
        ],
        "fallbackCommand": "where appname"
      },
      "launch": {
        "executable": "auto-detected",
        "arguments": []
      },
      "fallback": {
        "type": "url",
        "url": "https://app.com/download",
        "message": "App installer opened"
      }
    }
  ]
}
```

## Properti Konfigurasi

### Root Object
- `appButtons`: Array berisi konfigurasi tombol aplikasi

### App Button Object
- `id` (string): ID unik untuk aplikasi
- `name` (string): Nama yang ditampilkan di tombol
- `enabled` (boolean): Apakah tombol diaktifkan atau tidak

### Style Object
- `backgroundColor` (string): Warna background tombol
- `hoverColor` (string): Warna saat hover
- `activeColor` (string): Warna saat diklik
- `textColor` (string): Warna teks

### Detection Object
- `type` (string): Tipe deteksi ("executable")
- `paths` (array): Daftar path untuk mencari executable
- `fallbackCommand` (string): Command fallback untuk mencari aplikasi

### Launch Object
- `executable` (string): Path executable atau "auto-detected"
- `arguments` (array): Argumen command line

### Fallback Object
- `type` (string): Tipe fallback ("url")
- `url` (string): URL installer atau download page
- `message` (string): Pesan yang ditampilkan saat fallback dieksekusi

**Note**: URL fallback akan dibuka di dalam browser Electron, bukan di browser default user.

## Environment Variables

Anda dapat menggunakan environment variables di path:
- `%USERPROFILE%`: User profile directory
- `%PROGRAMFILES%`: Program Files directory
- `%PROGRAMFILES(X86)%`: Program Files (x86) directory

## Wildcard Paths

Untuk aplikasi dengan versioning di folder name:
```json
"paths": [
  "%USERPROFILE%\\AppData\\Local\\Discord\\app-*\\Discord.exe"
]
```

## Contoh Aplikasi yang Didukung

### Discord
```json
{
  "id": "discord",
  "name": "Discord", 
  "enabled": true,
  "style": {
    "backgroundColor": "#5865F2",
    "hoverColor": "#4752C4",
    "activeColor": "#3C45A5", 
    "textColor": "#ffffff"
  }
}
```

### Spotify
```json
{
  "id": "spotify",
  "name": "Spotify",
  "enabled": false,
  "style": {
    "backgroundColor": "#1DB954",
    "hoverColor": "#1ed760", 
    "activeColor": "#169c46",
    "textColor": "#ffffff"
  }
}
```

## Cara Menggunakan

1. **Edit file `app-buttons.json`** untuk menambah/mengedit aplikasi
2. **Set `enabled: true`** untuk mengaktifkan tombol
3. **Restart aplikasi** atau reload konfigurasi untuk melihat perubahan

## Menambah Aplikasi Baru

1. Buka `app-buttons.json`
2. Tambahkan object baru ke array `appButtons`
3. Set konfigurasi sesuai kebutuhan
4. Set `enabled: true`
5. Save file dan restart aplikasi

- Test path aplikasi sebelum menambahkan ke konfigurasi
- Gunakan fallback URL yang valid
- ID harus unik untuk setiap aplikasi

## Troubleshooting

- **Tombol tidak muncul**: Periksa `enabled: true` dan syntax JSON
- **Aplikasi tidak launch**: Periksa path di `detection.paths`
