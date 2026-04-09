# Face API REST - Quick Start Guide

## 🚀 Quick Start

### 1. Konfigurasi API Server

Set environment variables atau edit `Browser.js`:

```bash
# Environment variables
FACE_API_URL=https://your-api-server.com
FACE_API_CLIENT_ID=your_client_id
```

### 2. Buka Face API Panel

Tekan **Ctrl+Shift+A** (Windows/Linux) atau **Cmd+Shift+A** (macOS)

### 3. Fitur yang Tersedia

**5 Tabs di Face API Panel:**

#### 📝 Register Tab
- Daftarkan user baru dengan foto
- Input: User ID (NIK) + User Name
- Capture foto dari camera
- Simpan ke server

#### ✅ Verify Tab (1:1 Authentication)
- Verifikasi user yang sudah terdaftar
- Input: User ID
- Capture foto dan bandingkan dengan data di server
- Hasil: Verified/Not Verified + Similarity %

#### 🔍 Identify Tab (1:N Authentication)
- Identifikasi user dari semua registered users
- Tidak perlu input User ID
- Capture foto dan sistem cari matching user
- Hasil: User Name + User ID + Confidence Level

#### ⚖️ Compare Tab
- Bandingkan 2 foto tanpa database
- Capture 2 foto (source & target)
- Hasil: Match/No Match + Similarity %

#### 👥 Users Tab
- Lihat semua registered users
- Delete user
- Refresh list

## 📋 API Endpoints

| Endpoint | Method | Fungsi |
|----------|--------|--------|
| `/facegallery/register-face` | POST | Register user baru |
| `/facegallery/verify-face` | POST | Verify user (1:1) |
| `/facegallery/identify-face` | POST | Identify user (1:N) |
| `/compare-images` | POST | Compare 2 images |
| `/facegallery/delete-face` | DELETE | Delete user |

## 🎯 Use Cases

### Exam Authentication
1. Student register sebelum ujian
2. Verify saat login
3. Periodic verification setiap 10 menit

### Proctoring
1. Identify siapa yang di depan camera
2. Log activity
3. Alert jika bukan student yang terdaftar

### Duplicate Check
1. Compare foto baru dengan existing
2. Prevent duplicate registration

## ⌨️ Keyboard Shortcuts

| Shortcut | Fungsi |
|----------|--------|
| **Ctrl+Shift+A** | Open Face API Panel (REST API) |
| **Ctrl+Shift+F** | Open Face Verification Overlay (Client-side) |
| **Ctrl+Shift+Q** | Exit Browser (with password) |

## 📁 Files Created

```
packages/shell/browser/
├── services/
│   ├── face-api-client.js       # REST API client
│   └── face-api-service.js      # Service wrapper
├── handlers/
│   └── face-api-handler.js      # IPC handlers
├── preload/
│   └── face-api-preload.js      # Preload API
├── ui/
│   ├── face-api-panel.html      # UI panel
│   ├── face-api-panel-ui.js     # JavaScript
│   └── inject-face-api-panel.js # Injection script
└── utils/
    └── face-api-panel-helper.js # Helper
```

## 🔧 Configuration

Edit `face-api-service.js` constructor:

```javascript
this.client = new FaceAPIClient({
  baseURL: 'https://your-api-server.com',
  clientId: 'your_client_id',
  facegalleryId: 'kki_exam_browser',
  threshold: 0.75  // Similarity threshold
})
```

## 📊 Response Format

### Register Success
```json
{
  "success": true,
  "message": "User John Doe registered successfully",
  "userId": "NIK123456"
}
```

### Verify Success
```json
{
  "success": true,
  "verified": true,
  "similarity": 0.95,
  "userName": "John Doe",
  "hasMask": false
}
```

### Identify Success
```json
{
  "success": true,
  "identified": true,
  "userId": "NIK123456",
  "userName": "John Doe",
  "confidenceLevel": 0.92,
  "hasMask": false
}
```

## 🎨 UI Features

- **Dark theme** dengan glassmorphism
- **Real-time camera preview**
- **Status messages** (success/error/info)
- **Result display** dengan similarity percentage
- **Mask detection warning**
- **User management** (list & delete)

## 🔐 Security

- ✅ HTTPS required untuk API calls
- ✅ Client ID authentication
- ✅ Transaction ID untuk logging
- ✅ Local storage untuk registered users list
- ✅ Mask detection untuk security

## 📖 Full Documentation

Lihat `FACE_API_REST_INTEGRATION.md` untuk dokumentasi lengkap.

## 🆚 Client-side vs Server-side

| Feature | Client-side (face-api.js) | Server-side (REST API) |
|---------|---------------------------|------------------------|
| Processing | Browser (TensorFlow.js) | API Server |
| Database | Local (JSON file) | Centralized Database |
| Scalability | Limited | High |
| Accuracy | Good | Professional |
| Network | Not required | Required |
| Shortcut | Ctrl+Shift+F | Ctrl+Shift+A |

## ✅ Integration Complete

Semua fitur Face API REST sudah terintegrasi:

- ✅ API Client dengan 5 endpoints
- ✅ Service layer dengan local storage
- ✅ IPC handlers untuk main-renderer communication
- ✅ Preload API untuk renderer access
- ✅ UI Panel dengan 5 tabs
- ✅ Keyboard shortcut (Ctrl+Shift+A)
- ✅ Camera capture & base64 encoding
- ✅ Error handling & status messages
- ✅ User management (list & delete)
- ✅ Dokumentasi lengkap

Enjoy! 🎉
