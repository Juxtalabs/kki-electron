from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
from datetime import datetime
import base64
import io
from PIL import Image

app = FastAPI(title="Face API Mock Server", version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory database untuk testing
face_gallery = {}

# Models
class RegisterFaceRequest(BaseModel):
    user_id: str
    user_name: str
    facegallery_id: str
    image: str
    trx_id: Optional[str] = None

class VerifyFaceRequest(BaseModel):
    user_id: str
    facegallery_id: str
    image: str
    trx_id: Optional[str] = None

class IdentifyFaceRequest(BaseModel):
    facegallery_id: str
    image: str
    trx_id: Optional[str] = None

class CompareImagesRequest(BaseModel):
    source_image: str
    target_image: str
    trx_id: Optional[str] = None

class DeleteFaceRequest(BaseModel):
    user_id: str
    facegallery_id: str
    trx_id: Optional[str] = None

# Helper function to validate base64 image
def validate_image(image_base64: str) -> bool:
    try:
        # Remove data URL prefix if present
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]
        
        # Decode base64
        image_data = base64.b64decode(image_base64)
        
        # Try to open as image
        img = Image.open(io.BytesIO(image_data))
        
        # Check if image is valid
        if img.width < 50 or img.height < 50:
            return False
            
        return True
    except Exception as e:
        print(f"Image validation error: {e}")
        return False

# Helper to simulate face detection
def detect_face(image_base64: str) -> bool:
    """Simulate face detection - returns True if image is valid"""
    return validate_image(image_base64)

# Helper to calculate similarity (mock)
def calculate_similarity(image1: str, image2: str) -> float:
    """Mock similarity calculation - returns random similarity between 0.7-0.95"""
    import random
    return round(random.uniform(0.70, 0.95), 2)

@app.get("/")
async def root():
    return {
        "message": "Face API Mock Server",
        "version": "1.0.0",
        "endpoints": [
            "/facegallery/register-face",
            "/facegallery/verify-face",
            "/facegallery/identify-face",
            "/facegallery/delete-face",
            "/compare-images"
        ]
    }

@app.post("/facegallery/register-face")
async def register_face(
    request: RegisterFaceRequest,
    x_clientid: Optional[str] = Header(None)
):
    """Register a new face to the gallery"""
    
    # Validate client ID
    if not x_clientid:
        raise HTTPException(status_code=401, detail="X-Clientid header required")
    
    # Validate image
    if not request.image:
        return {
            "status": "451",
            "status_message": "image is null"
        }
    
    if not validate_image(request.image):
        return {
            "status": "490",
            "status_message": "Cannot decode image base64"
        }
    
    if not detect_face(request.image):
        return {
            "status": "412",
            "status_message": "Face not detected"
        }
    
    # Store in gallery
    key = f"{request.facegallery_id}:{request.user_id}"
    face_gallery[key] = {
        "user_id": request.user_id,
        "user_name": request.user_name,
        "facegallery_id": request.facegallery_id,
        "image": request.image,
        "registered_at": datetime.now().isoformat(),
        "trx_id": request.trx_id
    }
    
    print(f"✅ Registered: {request.user_name} ({request.user_id}) in gallery {request.facegallery_id}")
    
    return {
        "status": "200",
        "status_message": "Success"
    }

@app.post("/facegallery/verify-face")
async def verify_face(
    request: VerifyFaceRequest,
    x_clientid: Optional[str] = Header(None)
):
    """Verify a face against registered user (1:1 authentication)"""
    
    if not x_clientid:
        raise HTTPException(status_code=401, detail="X-Clientid header required")
    
    # Validate image
    if not request.image:
        return {
            "status": "451",
            "status_message": "image is null"
        }
    
    if not validate_image(request.image):
        return {
            "status": "490",
            "status_message": "Cannot decode image base64"
        }
    
    if not detect_face(request.image):
        return {
            "status": "412",
            "status_message": "Face not detected"
        }
    
    # Check if user exists
    key = f"{request.facegallery_id}:{request.user_id}"
    if key not in face_gallery:
        return {
            "status": "415",
            "status_message": "user_id not found"
        }
    
    # Get registered user
    registered_user = face_gallery[key]
    
    # Calculate similarity (mock)
    similarity = calculate_similarity(request.image, registered_user["image"])
    verified = similarity >= 0.75  # Threshold 75%
    
    print(f"🔍 Verify: {registered_user['user_name']} - Similarity: {similarity}, Verified: {verified}")
    
    return {
        "status": "200",
        "status_message": "Success",
        "user_name": registered_user["user_name"],
        "similarity": similarity,
        "verified": verified,
        "masker": False  # Mock: no mask detected
    }

@app.post("/facegallery/identify-face")
async def identify_face(
    request: IdentifyFaceRequest,
    x_clientid: Optional[str] = Header(None)
):
    """Identify a face from all registered users (1:N authentication)"""
    
    if not x_clientid:
        raise HTTPException(status_code=401, detail="X-Clientid header required")
    
    # Validate image
    if not request.image:
        return {
            "status": "451",
            "status_message": "image is null"
        }
    
    if not validate_image(request.image):
        return {
            "status": "490",
            "status_message": "Cannot decode image base64"
        }
    
    if not detect_face(request.image):
        return {
            "status": "412",
            "status_message": "Face not detected"
        }
    
    # Find matching user in gallery
    best_match = None
    best_confidence = 0.0
    
    for key, user_data in face_gallery.items():
        if user_data["facegallery_id"] == request.facegallery_id:
            confidence = calculate_similarity(request.image, user_data["image"])
            if confidence > best_confidence:
                best_confidence = confidence
                best_match = user_data
    
    if best_match and best_confidence >= 0.75:
        print(f"🔎 Identified: {best_match['user_name']} - Confidence: {best_confidence}")
        return {
            "status": "200",
            "status_message": "Success",
            "user_id": best_match["user_id"],
            "user_name": best_match["user_name"],
            "confidence_level": best_confidence,
            "mask": False
        }
    else:
        print(f"❌ No match found - Best confidence: {best_confidence}")
        return {
            "status": "411",
            "status_message": "Face not verified or unregistered"
        }

@app.post("/compare-images")
async def compare_images(
    request: CompareImagesRequest,
    x_clientid: Optional[str] = Header(None)
):
    """Compare two images without using database"""
    
    if not x_clientid:
        raise HTTPException(status_code=401, detail="X-Clientid header required")
    
    # Validate source image
    if not request.source_image:
        return {
            "status": "456",
            "status_message": "source_image is null"
        }
    
    if not validate_image(request.source_image):
        return {
            "status": "494",
            "status_message": "Cannot decode source_image base64"
        }
    
    # Validate target image
    if not request.target_image:
        return {
            "status": "455",
            "status_message": "target_image is null"
        }
    
    if not validate_image(request.target_image):
        return {
            "status": "492",
            "status_message": "Cannot decode target_image base64"
        }
    
    # Calculate similarity
    similarity = calculate_similarity(request.source_image, request.target_image)
    verified = similarity >= 0.75
    
    print(f"⚖️ Compare: Similarity: {similarity}, Verified: {verified}")
    
    return {
        "status": "200",
        "status_message": "Success",
        "similarity": similarity,
        "verified": verified,
        "masker": False
    }

@app.delete("/facegallery/delete-face")
async def delete_face(
    request: DeleteFaceRequest,
    x_clientid: Optional[str] = Header(None)
):
    """Delete a user from the gallery"""
    
    if not x_clientid:
        raise HTTPException(status_code=401, detail="X-Clientid header required")
    
    # Check if user exists
    key = f"{request.facegallery_id}:{request.user_id}"
    if key not in face_gallery:
        return {
            "status": "415",
            "status_message": "user_id not found"
        }
    
    # Delete user
    user_name = face_gallery[key]["user_name"]
    del face_gallery[key]
    
    print(f"🗑️ Deleted: {user_name} ({request.user_id})")
    
    return {
        "status": "200",
        "status_message": "Success"
    }

@app.get("/facegallery/my-facegalleries")
async def get_facegalleries(x_clientid: Optional[str] = Header(None)):
    """Get all facegalleries (for testing)"""
    
    if not x_clientid:
        raise HTTPException(status_code=401, detail="X-Clientid header required")
    
    galleries = {}
    for key, user_data in face_gallery.items():
        gallery_id = user_data["facegallery_id"]
        if gallery_id not in galleries:
            galleries[gallery_id] = []
        galleries[gallery_id].append({
            "user_id": user_data["user_id"],
            "user_name": user_data["user_name"],
            "registered_at": user_data["registered_at"]
        })
    
    return {
        "status": "200",
        "status_message": "Success",
        "facegalleries": galleries
    }

if __name__ == "__main__":
    print("🚀 Starting Face API Mock Server...")
    print("📍 Server will run at: http://localhost:8001")
    print("📖 API Docs: http://localhost:8001/docs")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8001)
