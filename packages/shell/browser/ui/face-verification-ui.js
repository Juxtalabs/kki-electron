class FaceVerificationUI {
  constructor() {
    this.video = document.getElementById('video')
    this.canvas = document.getElementById('canvas')
    this.cameraContainer = document.getElementById('camera-container')
    this.captureBtn = document.getElementById('capture-btn')
    this.setReferenceBtn = document.getElementById('set-reference-btn')
    this.closeBtn = document.getElementById('close-btn')
    this.status = document.getElementById('status')
    this.loading = document.getElementById('loading')
    this.countdown = document.getElementById('countdown')
    this.stream = null
    this.countdownInterval = null
    this.modelsLoaded = false
    
    this.init()
  }

  async init() {
    // Load face-api.js models
    await this.loadModels()
    
    // Check if reference descriptors exist, if not extract from pics folder
    await this.checkAndExtractReferences()
    
    // Event listeners
    this.captureBtn.addEventListener('click', () => this.captureAndVerify())
    this.setReferenceBtn.addEventListener('click', () => this.setReferencePhoto())
    this.closeBtn.addEventListener('click', () => this.closeCamera())
    
    // Listen for automatic capture trigger from main process
    if (window.faceVerification) {
      window.faceVerification.onTriggerCapture(() => {
        console.log('FaceVerificationUI: Automatic capture triggered')
        this.showCountdown(3, () => {
          this.captureAndVerifyAuto()
        })
      })
    }
  }
  
  async checkAndExtractReferences() {
    try {
      if (!window.faceVerification) {
        console.log('FaceVerificationUI: faceVerification API not available')
        return
      }
      
      // Check if references already exist
      const hasRefResult = await window.faceVerification.hasReferencePhotos()
      
      if (hasRefResult.hasReference && hasRefResult.count > 0) {
        console.log(`FaceVerificationUI: ${hasRefResult.count} reference descriptors already loaded`)
        this.showStatus(`${hasRefResult.count} reference photos loaded`, 'success')
        setTimeout(() => this.hideStatus(), 2000)
        return
      }
      
      // No references, extract from pics folder
      console.log('FaceVerificationUI: No references found, extracting from pics folder...')
      this.showStatus('Extracting face descriptors from photos...', 'info')
      
      const photosResult = await window.faceVerification.getPhotosForExtraction()
      
      if (!photosResult.success || photosResult.photos.length === 0) {
        console.log('FaceVerificationUI: No photos found in pics folder')
        this.showStatus('No photos found in pics folder', 'warning')
        setTimeout(() => this.hideStatus(), 3000)
        return
      }
      
      console.log(`FaceVerificationUI: Found ${photosResult.photos.length} photos, extracting descriptors...`)
      
      // Extract descriptors from all photos
      const descriptors = await this.extractDescriptorsFromPhotos(photosResult.photos)
      
      if (descriptors.length === 0) {
        console.log('FaceVerificationUI: No faces detected in photos')
        this.showStatus('No faces detected in photos', 'error')
        setTimeout(() => this.hideStatus(), 3000)
        return
      }
      
      // Save descriptors
      console.log(`FaceVerificationUI: Extracted ${descriptors.length} descriptors, saving...`)
      const saveResult = await window.faceVerification.setReferenceDescriptors(descriptors)
      
      if (saveResult.success) {
        console.log('FaceVerificationUI: Reference descriptors saved successfully')
        this.showStatus(`✓ Loaded ${descriptors.length} reference photos`, 'success')
        setTimeout(() => this.hideStatus(), 3000)
      } else {
        console.error('FaceVerificationUI: Failed to save descriptors:', saveResult.error)
        this.showStatus('Failed to save reference descriptors', 'error')
      }
    } catch (error) {
      console.error('FaceVerificationUI: Error in checkAndExtractReferences:', error)
      this.showStatus(`Error: ${error.message}`, 'error')
    }
  }
  
  async extractDescriptorsFromPhotos(photos) {
    const descriptors = []
    
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i]
      
      try {
        this.showStatus(`Processing ${i + 1}/${photos.length}: ${photo.fileName}`, 'info')
        console.log(`FaceVerificationUI: Processing ${photo.fileName}...`)
        
        // Create image element
        const img = document.createElement('img')
        img.src = photo.data
        
        // Wait for image to load
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
          setTimeout(() => reject(new Error('Image load timeout')), 10000)
        })
        
        // Detect face and extract descriptor
        const detection = await faceapi
          .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor()
        
        if (detection) {
          descriptors.push({
            fileName: photo.fileName,
            descriptor: Array.from(detection.descriptor)
          })
          console.log(`FaceVerificationUI: ✓ Extracted descriptor from ${photo.fileName}`)
        } else {
          console.warn(`FaceVerificationUI: ✗ No face detected in ${photo.fileName}`)
        }
      } catch (error) {
        console.error(`FaceVerificationUI: Error processing ${photo.fileName}:`, error)
      }
    }
    
    return descriptors
  }

  async loadModels() {
    try {
      this.showStatus('Loading face detection models...', 'info')
      console.log('FaceVerificationUI: Loading models...')
      
      // Load models from CDN
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/'
      
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL)
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      
      this.modelsLoaded = true
      console.log('FaceVerificationUI: Models loaded successfully')
      this.hideStatus()
    } catch (error) {
      console.error('FaceVerificationUI: Failed to load models:', error)
      this.showStatus('Failed to load face detection models', 'error')
      throw error
    }
  }

  async openCamera() {
    try {
      this.showStatus('Opening camera...', 'info')
      
      // Request camera access
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      })
      
      this.video.srcObject = this.stream
      this.cameraContainer.classList.add('active')
      this.showStatus('Camera ready', 'success')
      
      console.log('FaceVerificationUI: Camera opened successfully')
    } catch (error) {
      console.error('FaceVerificationUI: Failed to open camera:', error)
      this.showStatus(`Failed to open camera: ${error.message}`, 'error')
    }
  }

  closeCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }
    
    this.cameraContainer.classList.remove('active')
    this.hideStatus()
    console.log('FaceVerificationUI: Camera closed')
  }

  async detectFaceAndGetDescriptor() {
    try {
      if (!this.modelsLoaded) {
        throw new Error('Models not loaded yet')
      }
      
      // Detect face from video element directly
      const detection = await faceapi
        .detectSingleFace(this.video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor()
      
      if (!detection) {
        return null
      }
      
      // Return descriptor as array
      return Array.from(detection.descriptor)
    } catch (error) {
      console.error('FaceVerificationUI: Face detection failed:', error)
      throw error
    }
  }

  async captureAndVerify() {
    try {
      this.showLoading(true)
      this.showStatus('Detecting face...', 'info')
      
      const descriptor = await this.detectFaceAndGetDescriptor()
      
      if (!descriptor) {
        this.showStatus('No face detected. Please face the camera.', 'error')
        this.showLoading(false)
        return
      }
      
      this.showStatus('Verifying face...', 'info')
      
      if (window.faceVerification) {
        const result = await window.faceVerification.verifyDescriptor(descriptor)
        
        if (result.success) {
          if (result.verified) {
            this.showStatus(
              `✓ Verifikasi Sukses! (Distance: ${result.distance?.toFixed(4)})`,
              'success'
            )
          } else {
            this.showStatus(
              `✗ Verifikasi Gagal! (Distance: ${result.distance?.toFixed(4)}, Threshold: ${result.threshold})`,
              'error'
            )
          }
        } else {
          this.showStatus(`Error: ${result.message}`, 'error')
        }
      }
      
      this.showLoading(false)
    } catch (error) {
      console.error('FaceVerificationUI: Capture and verify failed:', error)
      this.showStatus(`Error: ${error.message}`, 'error')
      this.showLoading(false)
    }
  }

  async captureAndVerifyAuto() {
    try {
      console.log('FaceVerificationUI: Auto capture starting...')
      
      // Open camera if not already open
      if (!this.stream) {
        await this.openCamera()
        // Wait for video to be ready
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      const descriptor = await this.detectFaceAndGetDescriptor()
      
      // Send result back to main process
      if (window.faceVerification) {
        if (descriptor) {
          window.faceVerification.sendCaptureResult({
            success: true,
            descriptor: descriptor
          })
        } else {
          window.faceVerification.sendCaptureResult({
            success: false,
            error: 'No face detected'
          })
        }
      }
      
      console.log('FaceVerificationUI: Auto capture completed')
    } catch (error) {
      console.error('FaceVerificationUI: Auto capture failed:', error)
      
      if (window.faceVerification) {
        window.faceVerification.sendCaptureResult({
          success: false,
          error: error.message
        })
      }
    }
  }

  async setReferencePhoto() {
    try {
      this.showLoading(true)
      this.showStatus('Detecting face...', 'info')
      
      const descriptor = await this.detectFaceAndGetDescriptor()
      
      if (!descriptor) {
        this.showStatus('No face detected. Please face the camera.', 'error')
        this.showLoading(false)
        return
      }
      
      this.showStatus('Setting as reference...', 'info')
      
      if (window.faceVerification) {
        const result = await window.faceVerification.setReference(descriptor)
        
        if (result.success) {
          this.showStatus('✓ Reference photo saved successfully!', 'success')
        } else {
          this.showStatus(`✗ Failed to set reference: ${result.error}`, 'error')
        }
      }
      
      this.showLoading(false)
    } catch (error) {
      console.error('FaceVerificationUI: Set reference failed:', error)
      this.showStatus(`Error: ${error.message}`, 'error')
      this.showLoading(false)
    }
  }

  showCountdown(seconds, callback) {
    this.countdown.classList.add('active')
    let remaining = seconds
    
    const updateCountdown = () => {
      this.countdown.textContent = `Capturing in ${remaining}s...`
      remaining--
      
      if (remaining < 0) {
        clearInterval(this.countdownInterval)
        this.countdown.classList.remove('active')
        if (callback) callback()
      }
    }
    
    updateCountdown()
    this.countdownInterval = setInterval(updateCountdown, 1000)
  }

  showStatus(message, type) {
    this.status.textContent = message
    this.status.className = `status ${type}`
  }

  hideStatus() {
    this.status.className = 'status'
  }

  showLoading(show) {
    if (show) {
      this.loading.classList.add('active')
    } else {
      this.loading.classList.remove('active')
    }
  }
}

// Initialize UI when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.faceVerificationUI = new FaceVerificationUI()
  })
} else {
  window.faceVerificationUI = new FaceVerificationUI()
}
