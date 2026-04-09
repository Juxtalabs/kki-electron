# Face API REST Integration Guide

## Overview

Project ini sekarang mendukung **2 metode face recognition**:

1. **Client-side (face-api.js)** - Face detection dan verification menggunakan TensorFlow.js di browser
2. **Server-side (Face API REST)** - Face recognition menggunakan REST API server

## 🌐 Face API REST Endpoints

Berdasarkan dokumentasi Face API, tersedia 5 endpoint utama:

### 1. Register Face
**POST** `/facegallery/register-face`

Register wajah user baru ke database.

**Request:**
```json
{
  "user_id": "NIK123456",
  "user_name": "John Doe",
  "facegallery_id": "kki_exam_browser",
  "image": "base64_encoded_image",
  "trx_id": "reg_1234567890"
}
```

**Response:**
```json
{
  "status": "200",
  "status_message": "Success"
}
```

### 2. Verify Face (1:1 Authentication)
**POST** `/facegallery/verify-face`

Verifikasi wajah dengan user yang sudah terdaftar.

**Request:**
```json
{
  "user_id": "NIK123456",
  "facegallery_id": "kki_exam_browser",
  "image": "base64_encoded_image",
  "trx_id": "verify_1234567890"
}
```

**Response:**
```json
{
  "status": "200",
  "status_message": "Success",
  "user_name": "John Doe",
  "similarity": 0.95,
  "verified": true,
  "masker": false
}
```

### 3. Identify Face (1:N Authentication)
**POST** `/facegallery/identify-face`

Identifikasi user dari semua registered users.

**Request:**
```json
{
  "facegallery_id": "kki_exam_browser",
  "image": "base64_encoded_image",
  "trx_id": "identify_1234567890"
}
```

**Response:**
```json
{
  "status": "200",
  "status_message": "Success",
  "user_id": "NIK123456",
  "user_name": "John Doe",
  "confidence_level": 0.92,
  "mask": false
}
```

### 4. Compare Images
**POST** `/compare-images`

Bandingkan 2 gambar tanpa menggunakan database.

**Request:**
```json
{
  "source_image": "base64_encoded_image_1",
  "target_image": "base64_encoded_image_2",
  "trx_id": "compare_1234567890"
}
```

**Response:**
```json
{
  "status": "200",
  "status_message": "Success",
  "similarity": 0.88,
  "verified": true,
  "masker": false
}
```

### 5. Delete Face
**DELETE** `/facegallery/delete-face`

Hapus user dari database.

**Request:**
```json
{
  "user_id": "NIK123456",
  "facegallery_id": "kki_exam_browser",
  "trx_id": "delete_1234567890"
}
```

**Response:**
```json
{
  "status": "200",
  "status_message": "Success"
}
```

## 🚀 Cara Menggunakan

### 1. Konfigurasi API

Edit file konfigurasi atau set environment variables:

```bash
# .env atau environment variables
FACE_API_URL=https://your-api-server.com
FACE_API_CLIENT_ID=your_client_id
```

Atau edit langsung di `Browser.js`:

```javascript
this.faceAPIService = new FaceAPIService({
  baseURL: 'https://your-api-server.com',
  clientId: 'your_client_id',
  facegalleryId: 'kki_exam_browser',
  threshold: 0.75
})
```

### 2. Buka Face API Panel

Tekan **Ctrl+Shift+A** (atau **Cmd+Shift+A** di macOS) untuk membuka Face API Panel.

Panel akan muncul di kanan atas browser dengan 5 tabs:

- **Register** - Daftarkan user baru
- **Verify** - Verifikasi user (1:1)
- **Identify** - Identifikasi user (1:N)
- **Compare** - Bandingkan 2 gambar
- **Users** - Lihat dan kelola registered users

### 3. Register User Baru

1. Buka tab **Register**
2. Masukkan **User ID** (eg. NIK)
3. Masukkan **User Name**
4. Klik **Start Camera**
5. Posisikan wajah di depan kamera
6. Klik **📸 Capture & Register**

User akan terdaftar di server dan tersimpan di local list.

### 4. Verify User (1:1 Authentication)

1. Buka tab **Verify**
2. Masukkan **User ID** yang akan diverifikasi
3. Klik **Start Camera**
4. Posisikan wajah di depan kamera
5. Klik **🔍 Capture & Verify**

Hasil akan menampilkan:
- ✓ VERIFIED atau ✗ NOT VERIFIED
- Similarity percentage
- User name (jika verified)
- Warning jika terdeteksi masker

### 5. Identify User (1:N Authentication)

1. Buka tab **Identify**
2. Klik **Start Camera**
3. Posisikan wajah di depan kamera
4. Klik **🔎 Capture & Identify**

Sistem akan mencari matching user dari semua registered users dan menampilkan:
- User name
- User ID
- Confidence level

### 6. Compare Images

1. Buka tab **Compare**
2. Klik **Start Camera**
3. Klik **📸 Capture Source** untuk capture gambar pertama
4. Klik **📸 Capture Target** untuk capture gambar kedua
5. Klik **⚖️ Compare Images**

Hasil akan menampilkan:
- ✓ MATCH atau ✗ NO MATCH
- Similarity percentage

### 7. Manage Users

1. Buka tab **Users**
2. Klik **🔄 Refresh List** untuk load registered users
3. Klik **Delete** untuk hapus user

## 📁 File Structure

```
packages/shell/browser/
├── services/
│   ├── face-api-client.js          # REST API client
│   ├── face-api-service.js         # Service wrapper
│   └── face-verification-service.js # Client-side service (existing)
├── handlers/
│   ├── face-api-handler.js         # IPC handlers untuk REST API
│   └── face-verification-handler.js # IPC handlers untuk client-side
├── preload/
│   ├── face-api-preload.js         # Preload untuk REST API
│   └── face-verification-preload.js # Preload untuk client-side
├── ui/
│   ├── face-api-panel.html         # UI panel untuk REST API
│   ├── face-api-panel-ui.js        # JavaScript untuk panel
│   ├── inject-face-api-panel.js    # Injection script
│   └── face-verification-overlay.html # UI untuk client-side
└── utils/
    ├── face-api-panel-helper.js    # Helper untuk open panel
    └── face-verification-helper.js  # Helper untuk client-side
```

## 🔧 Technical Details

### API Client (`face-api-client.js`)

Class `FaceAPIClient` menangani semua HTTP requests ke Face API server:

```javascript
const client = new FaceAPIClient({
  baseURL: 'https://api.example.com',
  clientId: 'absensi_live',
  facegalleryId: 'kki_exam_browser',
  threshold: 0.75
})

// Register face
await client.registerFace(userId, userName, imageBase64)

// Verify face
await client.verifyFace(userId, imageBase64)

// Identify face
await client.identifyFace(imageBase64)

// Compare images
await client.compareImages(sourceImage, targetImage)

// Delete face
await client.deleteFace(userId)
```

### Service Layer (`face-api-service.js`)

Class `FaceAPIService` mengelola state dan local storage:

- Menyimpan list registered users di `userData/registered-users.json`
- Menangani error handling
- Logging untuk debugging

### IPC Communication

**Main Process → Renderer Process:**
```javascript
// Renderer process
const result = await window.faceAPI.registerUser(userId, userName, imageBase64)
const result = await window.faceAPI.verifyUser(userId, imageBase64)
const result = await window.faceAPI.identifyUser(imageBase64)
const result = await window.faceAPI.compareImages(source, target)
const result = await window.faceAPI.deleteUser(userId)
const users = await window.faceAPI.getRegisteredUsers()
```

### Image Capture

Panel menggunakan HTML5 Canvas untuk capture image dari video stream:

```javascript
const canvas = document.createElement('canvas')
const ctx = canvas.getContext('2d')
canvas.width = video.videoWidth
canvas.height = video.videoHeight
ctx.drawImage(video, 0, 0)

// Get base64 without prefix
const dataURL = canvas.toDataURL('image/jpeg', 0.9)
const base64 = dataURL.split(',')[1]
```

## 📊 Status Codes

| Code | Type | Description |
|------|------|-------------|
| 200 | Success | Success messages |
| 400 | General Error | Request malformed |
| 401 | General Error | Not authorized |
| 403 | General Error | Requested resource denied |
| 411 | Business Process Warning | Face not verified or unregistered |
| 412 | Business Process Warning | Face not detected |
| 413 | Business Process Warning | Face too small |
| 415 | Resource Not Found | user_id not found |
| 416 | Resource Not Found | facegallery_id not found |
| 451 | Resource Not Found | image is null |
| 452-456 | Data Format Error | Missing required fields |
| 490-495 | Image Error | Image decode/format errors |

## 🎯 Use Cases

### Use Case 1: Exam Authentication
```
1. Student register wajah sebelum ujian (Register)
2. Saat mulai ujian, verify identity (Verify 1:1)
3. Periodic verification setiap 10 menit (Verify 1:1)
4. Jika gagal verify, trigger alert
```

### Use Case 2: Proctoring
```
1. Multiple students di satu ruangan
2. Camera capture periodic
3. Identify siapa yang sedang di depan kamera (Identify 1:N)
4. Log activity untuk audit trail
```

### Use Case 3: Duplicate Check
```
1. Saat register user baru
2. Capture foto
3. Compare dengan semua existing photos (Compare)
4. Jika ada yang match, reject registration (duplicate)
```

## 🔐 Security Considerations

1. **API Key Management**
   - Jangan hardcode API key di code
   - Gunakan environment variables
   - Rotate keys secara berkala

2. **Image Data**
   - Base64 images bisa besar (200-500KB per image)
   - Consider compression sebelum send ke server
   - Implement rate limiting

3. **User Data**
   - Registered users list disimpan local
   - Encrypt sensitive data
   - Implement proper access control

4. **Network Security**
   - Gunakan HTTPS untuk semua API calls
   - Validate SSL certificates
   - Implement request timeout

## 🐛 Troubleshooting

### Panel tidak muncul
- Cek apakah shortcut Ctrl+Shift+A sudah registered
- Cek Console DevTools untuk error
- Pastikan injection script berhasil

### Camera tidak bisa diakses
- Cek permission browser untuk camera
- Pastikan tidak ada aplikasi lain yang pakai camera
- Restart browser

### API request gagal
- Cek network connection
- Verify API URL dan credentials
- Cek API server status
- Lihat response error message

### Face not detected
- Pastikan pencahayaan cukup
- Wajah harus menghadap kamera
- Jarak tidak terlalu jauh/dekat
- Hindari occlusion (masker, tangan, rambut)

## 📝 Next Steps

1. **Configure API Server**
   - Setup Face API server
   - Get API credentials
   - Update configuration

2. **Test Integration**
   - Register test users
   - Test verification
   - Test identification
   - Monitor API responses

3. **Production Deployment**
   - Setup production API endpoint
   - Configure proper credentials
   - Implement monitoring
   - Setup logging

## 🎉 Benefits

✅ **Server-side Processing** - Tidak membebani client  
✅ **Centralized Database** - Semua users di satu tempat  
✅ **Scalable** - Support banyak users  
✅ **Professional** - Menggunakan dedicated face recognition API  
✅ **Flexible** - Support berbagai use cases (verify, identify, compare)  
✅ **Mask Detection** - Detect jika user pakai masker  
✅ **Transaction Logging** - Semua request punya transaction ID  

## 📚 References

- Face API Documentation: `Face API Docs - Bima.pdf.htm`
- Client-side Integration: `AUTO_FACE_EXTRACTION_GUIDE.md`
- Quick Start: `FACE_VERIFICATION_QUICKSTART.md`
