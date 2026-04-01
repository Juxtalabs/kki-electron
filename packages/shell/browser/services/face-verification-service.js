const { app, Notification } = require('electron')
const path = require('path')
const fs = require('fs').promises

class FaceVerificationService {
  constructor() {
    this.isInitialized = false
    this.referenceDescriptor = null
    this.verificationTimer = null
    this.initialVerificationTimer = null
    this.SIMILARITY_THRESHOLD = 0.6 // Threshold untuk matching (0-1, semakin rendah semakin strict)
    this.INITIAL_DELAY = 30000 // 30 detik
    this.INTERVAL_DELAY = 600000 // 10 menit (600000 ms)
    
    // Path untuk menyimpan data
    this.userDataPath = app.getPath('userData')
    this.referenceDescriptorPath = path.join(this.userDataPath, 'reference-descriptor.json')
  }

  async initialize() {
    if (this.isInitialized) return

    console.log('FaceVerificationService: Initializing...')
    
    try {
      // Load reference photo descriptor jika sudah ada
      await this.loadReferenceDescriptor()
      
      this.isInitialized = true
      console.log('FaceVerificationService: Initialized successfully')
    } catch (error) {
      console.error('FaceVerificationService: Initialization failed:', error)
      throw error
    }
  }


  async setReferenceDescriptor(descriptorArray) {
    try {
      console.log('FaceVerificationService: Setting reference descriptor...')
      
      // Simpan descriptor
      this.referenceDescriptor = new Float32Array(descriptorArray)
      await fs.writeFile(
        this.referenceDescriptorPath,
        JSON.stringify(descriptorArray)
      )
      
      console.log('FaceVerificationService: Reference descriptor set successfully')
      return { success: true, message: 'Reference descriptor saved' }
    } catch (error) {
      console.error('FaceVerificationService: Failed to set reference descriptor:', error)
      throw error
    }
  }

  async loadReferenceDescriptor() {
    try {
      const descriptorData = await fs.readFile(this.referenceDescriptorPath, 'utf-8')
      const descriptorArray = JSON.parse(descriptorData)
      this.referenceDescriptor = new Float32Array(descriptorArray)
      console.log('FaceVerificationService: Reference descriptor loaded')
    } catch (error) {
      console.log('FaceVerificationService: No reference descriptor found, will need to set one')
      this.referenceDescriptor = null
    }
  }

  verifyDescriptor(capturedDescriptorArray) {
    try {
      if (!this.referenceDescriptor) {
        return {
          success: false,
          verified: false,
          message: 'No reference descriptor set. Please set a reference photo first.',
          distance: null
        }
      }

      if (!capturedDescriptorArray || capturedDescriptorArray.length === 0) {
        return {
          success: true,
          verified: false,
          message: 'No face detected in captured photo',
          distance: null
        }
      }

      console.log('FaceVerificationService: Verifying captured face...')
      
      // Convert to Float32Array for comparison
      const capturedDescriptor = new Float32Array(capturedDescriptorArray)
      
      // Calculate Euclidean distance
      let sum = 0
      for (let i = 0; i < this.referenceDescriptor.length; i++) {
        const diff = this.referenceDescriptor[i] - capturedDescriptor[i]
        sum += diff * diff
      }
      const distance = Math.sqrt(sum)
      
      const verified = distance < this.SIMILARITY_THRESHOLD
      
      console.log(`FaceVerificationService: Face comparison - Distance: ${distance.toFixed(4)}, Verified: ${verified}`)
      
      return {
        success: true,
        verified: verified,
        message: verified ? 'Face verified successfully' : 'Face verification failed',
        distance: distance,
        threshold: this.SIMILARITY_THRESHOLD
      }
    } catch (error) {
      console.error('FaceVerificationService: Verification error:', error)
      return {
        success: false,
        verified: false,
        message: `Verification error: ${error.message}`,
        distance: null
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

  hasReferencePhoto() {
    return this.referenceDescriptor !== null
  }

  destroy() {
    this.stopPeriodicVerification()
    console.log('FaceVerificationService: Destroyed')
  }
}

module.exports = { FaceVerificationService }
