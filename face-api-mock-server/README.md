# Face API Mock Server

Mock server untuk testing Face API integration menggunakan FastAPI.

## 🚀 Quick Start

### 1. Install Python Dependencies

```bash
cd face-api-mock-server
pip install -r requirements.txt
```

### 2. Run Server

```bash
python main.py
```

Server akan berjalan di: **http://localhost:8001**

### 3. Update Electron App Configuration

Edit `packages/shell/browser/services/face-api-service.js`:

```javascript
this.client = new FaceAPIClient({
  baseURL: 'http://localhost:8001',  // ← Ganti ke localhost
  clientId: 'bima',
  facegalleryId: 'kki_exam_browser',
  threshold: 0.75
})
```

Atau set environment variable:

```bash
$env:FACE_API_URL="http://localhost:8001"
```

**NOTE:** Default baseURL sudah diupdate ke `http://localhost:8001`, jadi tidak perlu edit manual lagi!

## 📖 API Documentation

Setelah server running, buka:
- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

## 🔌 Available Endpoints

### 1. Register Face
**POST** `/facegallery/register-face`

Register user baru dengan foto.

**Headers:**
- `X-Clientid`: bima

**Body:**
```json
{
  "user_id": "ABC123",
  "user_name": "John Doe",
  "facegallery_id": "kki_exam_browser",
  "image": "base64_encoded_image",
  "trx_id": "reg_123456"
}
```

### 2. Verify Face (1:1)
**POST** `/facegallery/verify-face`

Verifikasi user yang sudah terdaftar.

**Headers:**
- `X-Clientid`: bima

**Body:**
```json
{
  "user_id": "ABC123",
  "facegallery_id": "kki_exam_browser",
  "image": "base64_encoded_image",
  "trx_id": "verify_123456"
}
```

**Response:**
```json
{
  "status": "200",
  "status_message": "Success",
  "user_name": "John Doe",
  "similarity": 0.92,
  "verified": true,
  "masker": false
}
```

### 3. Identify Face (1:N)
**POST** `/facegallery/identify-face`

Identifikasi user dari semua registered users.

**Headers:**
- `X-Clientid`: bima

**Body:**
```json
{
  "facegallery_id": "kki_exam_browser",
  "image": "base64_encoded_image",
  "trx_id": "identify_123456"
}
```

**Response:**
```json
{
  "status": "200",
  "status_message": "Success",
  "user_id": "ABC123",
  "user_name": "John Doe",
  "confidence_level": 0.88,
  "mask": false
}
```

### 4. Compare Images
**POST** `/compare-images`

Bandingkan 2 gambar tanpa database.

**Headers:**
- `X-Clientid`: bima

**Body:**
```json
{
  "source_image": "base64_encoded_image_1",
  "target_image": "base64_encoded_image_2",
  "trx_id": "compare_123456"
}
```

**Response:**
```json
{
  "status": "200",
  "status_message": "Success",
  "similarity": 0.85,
  "verified": true,
  "masker": false
}
```

### 5. Delete Face
**DELETE** `/facegallery/delete-face`

Hapus user dari gallery.

**Headers:**
- `X-Clientid`: bima

**Body:**
```json
{
  "user_id": "ABC123",
  "facegallery_id": "kki_exam_browser",
  "trx_id": "delete_123456"
}
```

### 6. Get Facegalleries (Bonus)
**GET** `/facegallery/my-facegalleries`

List semua registered users (untuk testing).

**Headers:**
- `X-Clientid`: bima

## 🎯 Features

✅ **In-memory database** - Data tersimpan selama server running  
✅ **Image validation** - Validasi base64 image format  
✅ **Face detection simulation** - Mock face detection  
✅ **Similarity calculation** - Random similarity 70-95%  
✅ **CORS enabled** - Support cross-origin requests  
✅ **Auto documentation** - Swagger UI & ReDoc  
✅ **Console logging** - Log semua operations  

## 🧪 Testing

### Test dengan cURL (PowerShell)

```powershell
# Test register
$body = @{
    user_id = "TEST001"
    user_name = "Test User"
    facegallery_id = "kki_exam_browser"
    image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    trx_id = "test_123"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8001/facegallery/register-face" `
  -Method POST `
  -Headers @{"X-Clientid"="bima"; "Content-Type"="application/json"} `
  -Body $body
```

### Test dengan Electron App

1. Start mock server: `python main.py`
2. Run Electron app (baseURL sudah otomatis ke `http://localhost:8001`)
4. Tekan **Ctrl+Shift+A** untuk buka Face API Panel
5. Test Register, Verify, Identify, Compare

## 📝 Notes

- **Data tidak persistent** - Data hilang saat server restart
- **Similarity random** - Selalu return 70-95% untuk testing
- **No real face recognition** - Hanya validasi image format
- **Threshold 75%** - Verified jika similarity >= 0.75

## 🔧 Troubleshooting

### Port 8000 sudah dipakai

Ganti port di `main.py`:

```python
uvicorn.run(app, host="0.0.0.0", port=8001)  # Ganti ke 8001
```

### CORS error

Server sudah enable CORS untuk semua origins. Jika masih error, cek browser console.

### Image validation gagal

Pastikan image dalam format base64 yang valid (JPEG/PNG).

## 🎉 Ready to Test!

Server siap digunakan untuk testing Face API integration tanpa perlu server production.
