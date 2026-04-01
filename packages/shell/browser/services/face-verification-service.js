const { app, Notification } = require('electron')
const path = require('path')
const fs = require('fs').promises
const { readPhotosFromDirectory } = require('../utils/extract-descriptors-from-photos')

class FaceVerificationService {
  constructor() {
    this.isInitialized = false
    this.referenceDescriptors = [] // Array of {fileName, descriptor}
    this.verificationTimer = null
    this.initialVerificationTimer = null
    this.SIMILARITY_THRESHOLD = 0.6 // Threshold untuk matching (0-1, semakin rendah semakin strict)
    this.INITIAL_DELAY = 30000 // 30 detik
    this.INTERVAL_DELAY = 600000 // 10 menit (600000 ms)
    
    // Path untuk menyimpan data
    this.userDataPath = app.getPath('userData')
    this.referenceDescriptorsPath = path.join(this.userDataPath, 'reference-descriptors.json')
    // __dirname is packages/shell/browser/services
    // Go up 4 levels to reach project root: services -> browser -> shell -> packages -> root
    this.picsDirectory = path.join(path.dirname(path.dirname(path.dirname(path.dirname(__dirname)))), 'pics')
    console.log('FaceVerificationService: pics directory:', this.picsDirectory)
  }

  async initialize() {
    if (this.isInitialized) return

    console.log('FaceVerificationService: Initializing...')
    
    try {
      // Load reference descriptors jika sudah ada
      await this.loadReferenceDescriptors()
      
      // If no descriptors loaded, try to read from pics directory
      if (this.referenceDescriptors.length === 0) {
        console.log('FaceVerificationService: No saved descriptors found, will extract from pics folder on first verification')
      }
      
      this.isInitialized = true
      console.log('FaceVerificationService: Initialized successfully')
    } catch (error) {
      console.error('FaceVerificationService: Initialization failed:', error)
      throw error
    }
  }


  async setReferenceDescriptors(descriptorsArray) {
    try {
      console.log(`FaceVerificationService: Setting ${descriptorsArray.length} reference descriptors...`)
      
      // Store descriptors
      this.referenceDescriptors = descriptorsArray.map(item => ({
        fileName: item.fileName,
        descriptor: new Float32Array(item.descriptor)
      }))
      
      // Save to file
      const dataToSave = descriptorsArray.map(item => ({
        fileName: item.fileName,
        descriptor: Array.from(item.descriptor)
      }))
      
      await fs.writeFile(
        this.referenceDescriptorsPath,
        JSON.stringify(dataToSave, null, 2)
      )
      
      console.log('FaceVerificationService: Reference descriptors saved successfully')
      return { success: true, message: `Saved ${descriptorsArray.length} reference descriptors` }
    } catch (error) {
      console.error('FaceVerificationService: Failed to set reference descriptors:', error)
      throw error
    }
  }

  async loadReferenceDescriptors() {
    try {
      const descriptorData = await fs.readFile(this.referenceDescriptorsPath, 'utf-8')
      const descriptorsArray = JSON.parse(descriptorData)
      
      this.referenceDescriptors = descriptorsArray.map(item => ({
        fileName: item.fileName,
        descriptor: new Float32Array(item.descriptor)
      }))
      
      console.log(`FaceVerificationService: Loaded ${this.referenceDescriptors.length} reference descriptors`)
    } catch (error) {
      console.log('FaceVerificationService: No saved reference descriptors found')
      this.referenceDescriptors = []
    }
  }
  
  async getPhotosForExtraction() {
    try {
      console.log(`FaceVerificationService: Reading photos from ${this.picsDirectory}`)
      const photos = await readPhotosFromDirectory(this.picsDirectory)
      return photos
    } catch (error) {
      console.error('FaceVerificationService: Failed to read photos:', error)
      return []
    }
  }

  verifyDescriptor(capturedDescriptorArray) {
    try {
      if (!this.referenceDescriptors || this.referenceDescriptors.length === 0) {
        return {
          success: false,
          verified: false,
          message: 'No reference descriptors set. Please extract descriptors from photos first.',
          distance: null,
          matchedFile: null
        }
      }

      if (!capturedDescriptorArray || capturedDescriptorArray.length === 0) {
        return {
          success: true,
          verified: false,
          message: 'No face detected in captured photo',
          distance: null,
          matchedFile: null
        }
      }

      console.log(`FaceVerificationService: Verifying captured face against ${this.referenceDescriptors.length} references...`)
      
      // Convert to Float32Array for comparison
      const capturedDescriptor = new Float32Array(capturedDescriptorArray)
      
      // Find best match among all reference descriptors
      let bestMatch = null
      let minDistance = Infinity
      
      for (const ref of this.referenceDescriptors) {
        // Calculate Euclidean distance
        let sum = 0
        for (let i = 0; i < ref.descriptor.length; i++) {
          const diff = ref.descriptor[i] - capturedDescriptor[i]
          sum += diff * diff
        }
        const distance = Math.sqrt(sum)
        
        if (distance < minDistance) {
          minDistance = distance
          bestMatch = ref.fileName
        }
      }
      
      const verified = minDistance < this.SIMILARITY_THRESHOLD
      
      console.log(`FaceVerificationService: Best match - File: ${bestMatch}, Distance: ${minDistance.toFixed(4)}, Verified: ${verified}`)
      
      return {
        success: true,
        verified: verified,
        message: verified ? `Face verified (matched: ${bestMatch})` : 'Face verification failed - no match found',
        distance: minDistance,
        threshold: this.SIMILARITY_THRESHOLD,
        matchedFile: verified ? bestMatch : null
      }
    } catch (error) {
      console.error('FaceVerificationService: Verification error:', error)
      return {
        success: false,
        verified: false,
        message: `Verification error: ${error.message}`,
        distance: null,
        matchedFile: null
      }
    }
  }

  startPeriodicVerification(captureCallback) {
    console.log('FaceVerificationService: Starting periodic verification...')
    
    // Clear existing timers
    this.stopPeriodicVerification()
    
    // Verifikasi pertama setelah 30 detik
    this.initialVerificationTimer = setTimeout(async () => {
      console.log('FaceVerificationService: Running initial verification (30s)')
      await this.performVerification(captureCallback)
      
      // Mulai interval 10 menit setelah verifikasi pertama
      this.verificationTimer = setInterval(async () => {
        console.log('FaceVerificationService: Running periodic verification (10min)')
        await this.performVerification(captureCallback)
      }, this.INTERVAL_DELAY)
    }, this.INITIAL_DELAY)
  }

  async performVerification(captureCallback) {
    try {
      // Callback untuk capture photo dari renderer process
      const result = await captureCallback()
      
      if (result.success) {
        this.showNotification(
          result.verified ? 'Verifikasi Sukses' : 'Verifikasi Gagal',
          result.message,
          result.verified
        )
      } else {
        this.showNotification('Verifikasi Error', result.message, false)
      }
    } catch (error) {
      console.error('FaceVerificationService: Verification failed:', error)
      this.showNotification('Verifikasi Error', error.message, false)
    }
  }

  stopPeriodicVerification() {
    if (this.initialVerificationTimer) {
      clearTimeout(this.initialVerificationTimer)
      this.initialVerificationTimer = null
    }
    
    if (this.verificationTimer) {
      clearInterval(this.verificationTimer)
      this.verificationTimer = null
    }
    
    console.log('FaceVerificationService: Periodic verification stopped')
  }

  showNotification(title, body, isSuccess) {
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: title,
        body: body,
        icon: isSuccess ? undefined : undefined, // Bisa tambahkan icon path
        urgency: isSuccess ? 'normal' : 'critical'
      })
      
      notification.show()
      console.log(`FaceVerificationService: Notification shown - ${title}: ${body}`)
    }
  }

  hasReferencePhotos() {
    return this.referenceDescriptors.length > 0
  }
  
  getReferenceCount() {
    return this.referenceDescriptors.length
  }

  destroy() {
    this.stopPeriodicVerification()
    console.log('FaceVerificationService: Destroyed')
  }
}

module.exports = { FaceVerificationService }
