# Design — Device Enrollment (Pengganti IP Whitelist)

**Status:** Draft untuk direview backend + IT KKI
**Terkait:** [PRD.md](PRD.md) · `packages/shell/browser/security/domain-interceptor.js`

---

## 1. Latar Belakang

Saat ini akses ke API ujian dibatasi dengan **IP whitelist** per venue. Pendekatan ini tidak lagi memadai:

- Hampir semua venue menggunakan **IP dinamis** — hanya venue yang punya data center sendiri yang memiliki IP statis.
- Whitelist harus di-update setiap kali IP venue berubah, sering kali di hari-H.
- Whitelist bersifat **berbasis lokasi**, bukan berbasis identitas. Ia hanya bisa menjawab "request ini datang dari gedung yang kami kenal", bukan "peserta ini duduk di mesin yang kami siapkan untuknya".

Solusi: setiap mesin ujian mendapat **device key unik** yang di-provision jauh hari sebelum ujian (enrollment). Device key menggantikan fungsi IP whitelist sebagai gerbang jaringan, dan bekerja tanpa bergantung pada IP.

**Device key bukan pengganti autentikasi peserta.** Peserta tetap login dengan kredensialnya sendiri. Device key hanya menjawab "mesin ini boleh bicara dengan API".

---

## 2. Prinsip Desain

Tiga keputusan yang menentukan seluruh rancangan:

**a. Enrollment = permintaan, bukan pemberian akses.**
Enrollment tidak memerlukan kredensial apa pun. Satu klik, tanpa login, tanpa kode. Yang dihasilkan hanyalah record berstatus `pending` dan sebuah key yang **belum berlaku**.

**b. Activation = gerbang sesungguhnya.**
Device key baru berlaku setelah admin KKI meng-activate batch-nya dari dashboard. Kontrol sepenuhnya berada di sisi KKI, bukan di sisi venue.

**c. Tidak ada secret yang didistribusikan ke pihak ketiga.**
IT staff di venue bukan pegawai KKI dan tidak punya akun. Karena enrollment tidak butuh kredensial, tidak ada token/kode/file yang perlu dikirim ke mereka — sehingga tidak ada yang bisa bocor.

Konsekuensi: siapa pun yang membongkar aplikasi bisa membuat record `pending`. Itu diterima sebagai risiko — record tersebut tidak pernah menjadi apa-apa tanpa activation, dan terlihat jelas di dashboard.

---

## 3. Model Data

### 3.1 Device

| Field | Tipe | Keterangan |
|---|---|---|
| `device_id` | string | ID publik, mis. `dev_8f3a2m7q` |
| `device_key` | string | Secret, dikirim aplikasi sebagai header. Simpan sebagai hash di server. |
| `fingerprint` | string | SHA-256 dari hardware ID + salt aplikasi |
| `status` | enum | `pending` · `active` · `revoked` · `expired` |
| `variant` | enum | `peserta` · `penguji` (lihat `browser/config/variant.js`) |
| `venue_id` | string \| null | Diisi saat activation, bukan saat enrollment |
| `hostname` | string | Nama komputer, untuk membantu identifikasi di dashboard |
| `os` | string | `win32 10.0.26200` / `darwin 24.1.0` |
| `app_version` | string | Versi KKI Browser saat enroll |
| `enroll_ip` | string | IP sumber saat enrollment — dipakai untuk clustering |
| `enrolled_at` | timestamp | |
| `activated_at` | timestamp \| null | |
| `activated_by` | string \| null | Admin KKI yang meng-activate |
| `expires_at` | timestamp \| null | Akhir masa berlaku (per exam cycle) |

### 3.2 State Machine

```
        enroll                activate
  ─────────────►  pending  ─────────────►  active
                     │                        │
                     │ reject                 │ revoke / expired
                     ▼                        ▼
                  revoked                  revoked
```

- `pending` — key tersimpan di mesin, tetapi **ditolak di semua endpoint**.
- `active` — key berlaku, selama `expires_at` belum lewat dan venue punya sesi terjadwal.
- `revoked` — ditolak permanen. Tidak bisa kembali ke `active`; mesin harus enroll ulang.
- `expired` — otomatis setelah `expires_at`. Enroll ulang di cycle berikutnya.

### 3.3 Enrollment Window

Enrollment hanya diterima ketika ada window yang terbuka.

| Field | Keterangan |
|---|---|
| `venue_id` | Venue yang sedang di-provision |
| `opens_at` / `closes_at` | Periode provisioning, mis. 3 hari sebelum ujian |
| `expected_seats` | Jumlah kursi sesuai kontrak — pembanding saat rekonsiliasi |
| `opened_by` | Admin KKI yang membuka window |

Di luar window, `POST /api/devices/enroll` menolak semua request. Ini mencegah record `pending` menumpuk sepanjang tahun.

> **Catatan:** window bersifat global-per-periode, bukan per-IP. Karena IP venue dinamis, server tidak bisa tahu venue mana yang sedang enroll pada saat request masuk — penentuan venue dilakukan saat activation (§5).

---

## 4. Alur Enrollment (Sisi Venue)

Dilakukan IT staff venue, beberapa hari sebelum ujian, satu kali per mesin.

```
1. Buka KKI Browser di mesin lab
2. Klik "Enroll Perangkat Ini"
3. Selesai — layar menampilkan Device ID + status "Menunggu aktivasi KKI"
```

Tidak ada login, tidak ada kode yang diketik, tidak ada file yang perlu di-merge.

**Payload yang dikirim aplikasi:**

```json
POST /api/devices/enroll
{
  "fingerprint": "sha256:9c1a...",
  "variant": "peserta",
  "hostname": "LAB-JKT3-12",
  "os": "win32 10.0.26200",
  "appVersion": "2.2.0"
}
```

**Response:**

```json
201 Created
{
  "deviceId": "dev_8f3a2m7q",
  "deviceKey": "dk_live_xxxxxxxxxxxx",
  "status": "pending",
  "message": "Perangkat terdaftar. Menunggu aktivasi dari Admin KKI."
}
```

**Error yang harus ditangani UI:**

| Kondisi | HTTP | Perilaku aplikasi |
|---|---|---|
| Di luar enrollment window | `403` | Tampilkan "Periode pendaftaran belum dibuka" |
| Fingerprint sudah terdaftar & `active` | `200` | Tulis ulang record lokal, tampilkan "Sudah terdaftar" (idempotent) |
| Fingerprint sudah terdaftar & `pending` | `200` | Kembalikan record yang sama, jangan buat duplikat |
| Rate limit terlampaui | `429` | Tampilkan pesan + minta hubungi KKI |

Enrollment **wajib idempotent terhadap fingerprint**. Lab sering di-reimage dan IT staff sering mengklik dua kali; keduanya tidak boleh menghasilkan device ganda.

---

## 5. Alur Activation (Sisi Admin KKI)

Di sinilah kontrol sesungguhnya berada. Satu tindakan per venue per cycle.

### 5.1 Clustering — menentukan venue tanpa IP statis

IP venue berubah setiap hari, tapi mesin-mesin di ruangan yang sama melakukan enrollment **dari egress IP yang sama dalam rentang waktu yang sama**. Server tidak perlu IP yang stabil selamanya — cukup stabil selama 40 menit.

Dashboard mengelompokkan record `pending` berdasarkan `(enroll_ip, jendela waktu)`:

```
Pending Enrollments — cycle 2026-08

├─ 103.94.x.x    02 Agu 09:12–09:41    45 devices   [ pilih venue ▾ ]  [Activate]
├─ 180.251.x.x   02 Agu 14:02–14:20    28 devices   [ pilih venue ▾ ]  [Activate]
└─ 41.77.x.x     03 Agu 03:14           3 devices   ⚠ tidak dikenali    [Reject]
```

Admin mencocokkan jumlah dengan `expected_seats`, memberi label venue, lalu meng-activate seluruh cluster sekaligus.

Cluster yang mencurigakan langsung terlihat: jumlah tidak sesuai kontrak, waktu di luar jam kerja, atau enrollment yang menetes selama tiga hari alih-alih satu sesi.

### 5.2 Endpoint Admin

Semua endpoint di bawah memerlukan autentikasi admin KKI (reuse mekanisme `super-admin` yang sudah ada — lihat `exitCodeUrl` di `browser/config/variant.js`).

| Method | Endpoint | Fungsi |
|---|---|---|
| `POST` | `/api/admin/enrollment-windows` | Buka window: `{venueId, opensAt, closesAt, expectedSeats}` |
| `GET` | `/api/admin/devices/pending?groupBy=cluster` | Daftar pending, dikelompokkan per cluster |
| `POST` | `/api/admin/devices/activate` | `{deviceIds[], venueId, expiresAt}` → status `active` |
| `POST` | `/api/admin/devices/revoke` | `{deviceIds[], reason}` → status `revoked` |
| `GET` | `/api/admin/venues/:id/devices` | Daftar device per venue + status |

---

## 6. Alur Hari-H (Validasi)

Aplikasi mengirim device key di setiap request ke domain KKI:

```
X-KKI-Device-Id:  dev_8f3a2m7q
X-KKI-Device-Key: dk_live_xxxxxxxxxxxx
```

Middleware server memvalidasi, berurutan:

1. Device key ada dan cocok dengan hash tersimpan
2. `status == active`
3. `expires_at` belum lewat
4. `variant` cocok dengan endpoint yang diakses (build penguji tidak boleh memakai endpoint peserta)
5. **Binding sesi** — peserta yang login terdaftar di `venue_id` yang sama dengan device
6. Device tidak sedang dipakai sesi lain secara bersamaan

Langkah 5–6 adalah keuntungan yang tidak pernah bisa diberikan IP whitelist: server dapat menolak peserta yang terdaftar di Jakarta tetapi login dari mesin yang di-enroll di Surabaya.

Di sisi client, aplikasi memverifikasi ulang fingerprint saat startup. Jika fingerprint mesin tidak cocok dengan record lokal (key disalin ke mesin lain), aplikasi menolak jalan sebelum request pertama dikirim.

---

## 7. Implementasi Client (Electron)

### 7.1 Lokasi Penyimpanan — harus machine-wide

**Constraint penting:** enrollment dilakukan IT staff, mungkin di bawah akun OS yang berbeda dengan akun peserta di hari-H. Karena itu penyimpanan **tidak boleh per-user**.

Lokasi **wajib di-scope per varian** — satu mesin bisa saja memiliki build peserta dan penguji sekaligus, dan keduanya memerlukan device record yang terpisah.

| Platform | Lokasi | Permission |
|---|---|---|
| Windows | `HKLM\SOFTWARE\KKI\Browser\<variant>` | ACL default HKLM: Administrators write, Users read |
| macOS | `/Library/Application Support/KKI Browser/enrollment-<variant>.json` | `root:wheel`, `0644` |

Yang **tidak** boleh dipakai:
- `app.getPath('userData')` — per-user, tidak terlihat oleh akun peserta.
- `safeStorage` — DPAPI/Keychain terikat ke akun yang mengenkripsi, sehingga tidak bisa didekripsi oleh akun lain. Key disimpan plaintext dan dilindungi ACL; enkripsi tidak menambah keamanan di sini karena aplikasi harus mendekripsi tanpa interaksi user.

Pada Windows, baca dengan `/reg:64` secara eksplisit agar tidak salah membaca `WOW6432Node`.

### 7.2 Isi Record Lokal

```json
{
  "deviceId": "dev_8f3a2m7q",
  "deviceKey": "dk_live_xxxxxxxxxxxx",
  "fingerprint": "sha256:9c1a...",
  "variant": "peserta",
  "status": "pending",
  "enrolledAt": "2026-08-02T09:14:00Z"
}
```

### 7.3 Fingerprint

| Platform | Sumber |
|---|---|
| Windows | `HKLM\SOFTWARE\Microsoft\Cryptography` → `MachineGuid` |
| macOS | `ioreg -rd1 -c IOPlatformExpertDevice` → `IOPlatformUUID` |

Hash dengan salt aplikasi sebelum dikirim — hardware UUID mentah tidak perlu melewati jaringan.

### 7.4 File yang Ditambahkan/Disentuh

| File | Perubahan |
|---|---|
| `browser/utils/enrollment.js` | **Baru** — read/write record per platform, fingerprint, panggilan API |
| `browser/security/device-header.js` | **Baru** — hook `onBeforeSendHeaders`, scope `https://*.kki.go.id/*` |
| `browser/security/domain-interceptor.js` | Pasang hook header di samping `onBeforeRequest` yang sudah ada (baris 26) |
| `browser/core/Browser.js` | Verifikasi fingerprint saat startup; blokir jika tidak cocok |
| `browser/preload/webui-preload.js` | Ekspos `enroll()` + `getStatus()` bila tombol diletakkan di halaman web |

Hook header **wajib di-scope ke domain KKI** — jangan pernah kirim device key ke host pihak ketiga (mis. unpkg yang ada di whitelist untuk library PDF).

### 7.5 Letak Tombol Enroll

Tombol boleh berada di UI Electron atau di halaman web ujian, tetapi **panggilan enrollment harus dieksekusi main process** — halaman web tidak bisa membaca `MachineGuid` / `IOPlatformUUID`. Jika tombol diletakkan di web, halaman hanya memicu lewat preload bridge (pola yang sama dengan `browser/preload/webui-preload.js:4`).

---

## 8. Keputusan yang Perlu Diambil

**a. Hak akses saat menulis HKLM / `/Library`.**
Menulis ke lokasi machine-wide memerlukan elevation. Dua pilihan:

1. **Installer menyiapkan lokasinya lebih dulu** (installer sudah berjalan elevated) — buat `HKLM\SOFTWARE\KKI\Browser` dan direktori macOS dengan ACE tambahan yang mengizinkan `Users` menulis **hanya pada subkey tersebut**. Enrollment lalu berjalan tanpa UAC → benar-benar satu klik. *Rekomendasi.*
2. **Minta elevation saat enroll** (UAC / `sudo` prompt). Lebih ketat, tapi menambah satu langkah dan gagal jika IT staff tidak punya admin di mesin tersebut.

Pilihan 1 melemahkan proteksi tulis, tetapi fingerprint binding sudah menutup dampaknya: user yang mengubah key hanya merusak mesinnya sendiri, dan key mesin lain tidak akan berfungsi.

**b. Bundle ID / appId bentrok antar varian.**
Kedua varian dikemas dengan identitas aplikasi yang sama — `appBundleId: 'io.kki.app'` di `packages/shell/forge.config.js:9`, dan `appId: 'io.kki.app'` di `package.json:63`. `scripts/package-mac.js:60-63` menimpa `productName`, artifact name, dan output dir per varian, tetapi **tidak** menimpa `appId`.

Ini tidak merusak penyimpanan enrollment selama path di-scope per varian (§7.1), tetapi menimbulkan masalah lain jika kedua build terpasang di satu mesin:

- **macOS TCC** — izin Accessibility / Input Monitoring / Screen Recording di-key berdasarkan bundle ID **dan** code signature. Dua binary berbeda dengan bundle ID sama membuat izin keyboard hook gagal secara intermiten atau ter-reset. Ini risiko terbesar karena menyangkut fitur kiosk inti.
- **macOS Launch Services** — menjalankan build kedua bisa hanya memunculkan build pertama; protocol handler terdaftar di bawah ID yang sama.
- **Windows NSIS** — uninstall registry entry diturunkan dari `appId`, sehingga install varian kedua dapat dianggap sebagai produk yang sama dan menimpa yang pertama.

Rekomendasi: tambahkan `appId` per varian di `browser/config/variant.js` (mis. `id.go.kki.browser.peserta` / `.penguji` — sekaligus memperbaiki urutan reverse-DNS), lalu gunakan di `forge.config.js` dan tambahkan `-c.appId=` di `package-mac.js`.

Lakukan **sebelum rollout meluas**: mengganti bundle ID membuat macOS memperlakukannya sebagai aplikasi baru, sehingga seluruh izin TCC harus disetujui ulang di setiap mesin yang sudah ter-deploy.

**c. Masa berlaku key.** Apakah `expires_at` diset per exam cycle (aman, perlu enroll ulang tiap periode) atau per tahun (lebih sedikit kerja lapangan)? Rekomendasi: per cycle, dengan enroll ulang yang idempotent sehingga biayanya rendah.

---

## 9. Rencana Migrasi

Jangan matikan IP whitelist sekaligus.

| Fase | Server | Client |
|---|---|---|
| 1 | Terima IP whitelist **atau** device key. Catat mana yang dipakai. | Rilis build dengan enrollment + header. |
| 2 | Sama, tetapi request tanpa device key ditandai warning di log. | Provisioning venue berjalan bertahap per cycle. |
| 3 | Device key **wajib**. IP whitelist tetap aktif sebagai lapisan tambahan **hanya** untuk venue ber-IP statis. | — |

Venue dengan data center sendiri tetap mempertahankan pengecekan IP sebagai lapisan tambahan — konfigurasi per venue:

```json
{ "venueId": "jakarta-dc", "requireDeviceKey": true, "allowedIps": ["103.x.x.x/29"] }
```

---

## 10. Risiko yang Diterima

| Risiko | Mitigasi | Sisa risiko |
|---|---|---|
| Siapa pun bisa membuat record `pending` | Window + rate limit + activation manual | Noise di dashboard |
| IT staff venue meng-enroll mesin yang salah | Rekonsiliasi jumlah vs `expected_seats`, review cluster | Tidak bisa dicegah tanpa staf KKI di lokasi |
| Device key dicuri dari mesin | Fingerprint binding (client + server) | Key tidak berguna di mesin lain |
| Mesin enrolled dipakai orang lain | Peserta tetap harus login; binding venue↔sesi | Sama seperti sebelumnya — ditangani proctoring |
| Venue di-reimage sebelum ujian | Enroll ulang idempotent | Perlu kunjungan ulang IT staff |

Yang **tidak** dijanjikan desain ini: mencegah orang dalam di venue yang punya akses fisik. Tidak ada skema berbasis kredensial yang bisa melakukannya. Yang didapat adalah: jumlah device terbatas dan diketahui, setiap device teridentifikasi dan ter-fingerprint, semuanya di-activate oleh staf KKI, dan setiap device terikat pada venue serta sesi terjadwal.
