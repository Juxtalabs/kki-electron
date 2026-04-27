# PRD — KKI Browser

**Produk:** KKI Browser (Safe Exam Browser)
**Platform:** Windows (NSIS installer), macOS (DMG/ZIP, x64 + arm64)
**Basis:** Electron 32 (fork dari `electron-browser-shell`)

---

## 1. Ringkasan

KKI Browser adalah browser terkunci (locked-down browser) yang digunakan oleh peserta Ujian Kompetensi di lingkungan Konsil Kesehatan Indonesia. Aplikasi ini menggantikan browser umum selama sesi ujian — peserta hanya dapat mengakses Portal Ujian resmi, tidak dapat berpindah aplikasi, dan tidak dapat menggunakan aplikasi komunikasi (WhatsApp) selama ujian berlangsung.

Tujuan utama: **menjamin integritas ujian** dengan membatasi lingkungan kerja peserta, memblokir jalur kecurangan yang umum (multi-tasking, chat, remote help), dan — di fase berikutnya — memastikan identitas peserta tetap konsisten sepanjang ujian.

## 2. Target Pengguna

| Persona | Kebutuhan |
|---|---|
| **Peserta ujian** | Menjalankan ujian di komputer pribadi/lab tanpa distraksi, tanpa harus install tool kompleks. |
| **Pengawas (proctor)** | Yakin peserta tidak membuka aplikasi lain; punya mekanisme keluar darurat (exit password). |
| **Admin IT KKI** | Deploy installer ke banyak lab, mengandalkan config yang hardcoded agar tidak bisa di-tamper. |

## 3. Masalah yang Dipecahkan

1. Peserta membuka browser lain / tab lain untuk mencari jawaban.
2. Peserta menerima bantuan lewat WhatsApp Desktop, Discord, dsb.
3. Peserta menggunakan shortcut sistem (Alt+Tab, Win key, Cmd+Tab) untuk keluar aplikasi.
4. Portal Ujian dapat diakses dari browser umum → kontrol integritas lemah.
5. Tidak ada jaminan bahwa peserta yang log in adalah yang sama hingga akhir sesi.

## 4. Ruang Lingkup Rilis Saat Ini (Shipped)

### 4.1 Force Fullscreen / Kiosk Mode
- Window dijalankan full screen, tidak dapat di-minimize atau di-resize.
- Shortcut keyboard sistem (Alt+Tab, Win/Super, Cmd+Tab, Alt+F4, F11, dll.) di-intercept lewat native keyboard hook.
- Frame/menubar browser disembunyikan; tidak ada address bar yang bisa diketik manual.

**Acceptance:**
- Peserta tidak dapat keluar window dengan kombinasi tombol apa pun selain exit password.
- Window selalu on-top pada mode ujian aktif.

### 4.2 Exit Password
- Keluar aplikasi hanya bisa dilakukan lewat dialog exit + password.
- Password di-hardcode di `packages/shell/browser/config/security.js` (`EXIT_PASSWORD`) agar tidak bisa diubah end-user.
- Password dipegang oleh pengawas/admin, bukan peserta.

**Acceptance:**
- Tombol close sistem, Alt+F4, Cmd+Q tidak keluar tanpa password.
- Salah password tidak menutup aplikasi dan tidak memberi indikasi mode debug.

### 4.3 Portal Ujian Hanya via Aplikasi Ini
- Backend portal memvalidasi request dengan User-Agent khusus: `SecureExamBrowser/Electron2026` (`ALLOWED_USER_AGENT`).
- Browser umum (Chrome, Firefox, Safari) akan ditolak di sisi backend karena tidak mengirim UA ini.
- Domain portal (`portal-ujian-ukom*`, termasuk `*konsilkesehatanindonesia.id*`) berada di `ADMIN_WHITELISTED_DOMAINS`.
- Domain lain di luar whitelist diblokir di level network (domain interceptor), kecuali resource yang diperlukan portal (S3 AP-Southeast-3, Cloudflare CDN).

**Acceptance:**
- Request ke portal dari Chrome biasa → ditolak backend.
- Navigasi ke domain non-whitelist di dalam app → halaman "Access Denied".

### 4.4 Blokir Aplikasi WhatsApp (Process Killer)
- Daftar proses yang akan dibunuh didefinisikan di `BLOCKED_PROCESSES` (`WhatsApp.exe`, `WhatsApp.Root.exe`, dan varian macOS).
- Polling setiap ~5 detik selama aplikasi berjalan; proses match akan di-terminate.
- Kompatibel Windows (via `taskkill`) dan macOS (via `pkill` / `kill`).

**Acceptance:**
- WhatsApp Desktop yang dibuka sebelum/selama ujian tertutup otomatis dalam ≤5 detik.
- Daftar proses dapat diperluas (Discord, Telegram, Zoom, dll.) dengan edit konfigurasi + rebuild.

### 4.5 Indikator Status Jaringan
- Status koneksi (online/offline, SSID jika tersedia) ditampilkan di UI browser.
- Saat koneksi putus, indikator berubah merah dan user mendapat peringatan visual.
- Tidak memblokir ujian saat offline sementara (toleransi reconnect) — peserta dibiarkan tahu bahwa jawabannya mungkin belum tersimpan.

**Acceptance:**
- Cabut Wi-Fi → indikator berubah dalam ≤3 detik.
- Reconnect → indikator kembali hijau tanpa restart aplikasi.

### 4.6 Dukungan Multi-Platform
- **Windows:** NSIS installer, icon `kki-icon.ico`, artifact `KKI-Browser-${version}-win.exe`.
- **macOS:** DMG + ZIP untuk x64 dan arm64, hardened runtime, entitlements custom (`build/entitlements.mac.plist`), kategori `public.app-category.education`.
- Satu codebase Electron, perbedaan platform ditangani di layer native (keyboard hook, process killer).

**Acceptance:**
- Installer Windows dan DMG macOS dihasilkan dari pipeline `package:mac` / `package` tanpa intervensi manual.
- Fitur inti (fullscreen, exit password, process killer, whitelist) jalan identik di kedua OS.

---

## 5. Ruang Lingkup Fase Berikutnya (In Development)

### 5.1 Face Recognition — Verifikasi Awal
**Tujuan:** memastikan wajah peserta di depan kamera sama dengan foto identitas yang terdaftar di akun portal.

**Flow:**
1. Setelah login portal, app meminta izin kamera (sekali, persistent selama sesi).
2. App meng-capture frame, mengirim ke service face-matching (backend KKI atau vendor).
3. Jika match score ≥ threshold → ujian dilanjutkan. Jika gagal, peserta diarahkan ke pengawas.

### 5.2 Capture Periodik Selama Ujian
**Tujuan:** mendeteksi pergantian peserta atau peserta meninggalkan lokasi ujian di tengah sesi.

**Flow:**
1. Interval capture konfigurable (draft: setiap 30–60 detik, acak dalam window untuk anti-prediksi).
2. Setiap frame dikirim beserta timestamp + session ID ke endpoint audit.
3. Deteksi anomali: tidak ada wajah, >1 wajah, wajah berbeda dari referensi. Anomali → flag, bukan auto-kick, agar keputusan tetap di tangan pengawas.

**Kebutuhan non-fungsional:**
- **Privasi/legal:** persetujuan eksplisit sebelum ujian; kebijakan retensi foto (draft: dihapus setelah skor ujian final, maks X hari).
- **Bandwidth:** kompres ke JPEG ≤50KB/frame; fallback buffer lokal saat offline lalu flush saat reconnect.
- **Performa:** capture tidak boleh menyebabkan lag pada UI ujian (target <2% CPU tambahan).
- **Kegagalan kamera:** kamera dicabut / tertutup fisik → flag anomali, jangan crash.

---

## 6. Kebutuhan Non-Fungsional

| Area | Target |
|---|---|
| **Security** | Config sensitif (exit password, whitelist, UA token) hardcoded dan dibundel — tidak ada file config yang bisa diubah user setelah install. |
| **Tamper resistance** | DevTools dinonaktifkan di production build; keyboard shortcut developer di-block. |
| **Kompatibilitas** | Windows 10+ (x64), macOS 12+ (Intel + Apple Silicon). |

## 7. Metrik Sukses

- **Integritas:** jumlah insiden "peserta terbukti pakai WhatsApp / browser lain saat ujian" turun ke mendekati nol setelah adopsi.
- **Adopsi:** 100% sesi Ukom berjalan via KKI Browser (tidak ada fallback ke browser umum).
- **Reliabilitas:** <1% sesi ujian terganggu karena bug/crash KKI Browser.
- **Face recognition (setelah rilis):** false-reject rate <2% pada kondisi pencahayaan normal; tingkat deteksi pergantian peserta >95% pada simulasi internal.

## 8. Dependensi Teknis

- **Electron 32.2.7** — runtime.
- **electron-builder 25** — packaging Windows/macOS.
- **Native keyboard hook** (`keyhook.node`) — Windows-specific C++ addon untuk intercept system shortcut.
- **Backend Portal Ujian** — harus memvalidasi `User-Agent: SecureExamBrowser/Electron2026`.

---
