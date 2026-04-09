const { app } = require('electron')
const path = require('path')
const fs = require('fs').promises
const { FaceAPIClient } = require('./face-api-client')

/**
 * Service untuk mengelola Face Recognition menggunakan REST API
 * Mendukung register, verify, identify, dan compare faces
 */
class FaceAPIService {
  constructor(config = {}) {
    this.client = new FaceAPIClient({
      // Base URL Face API server
      // Default: localhost mock server (untuk testing)
      // Production: set FACE_API_URL environment variable
      baseURL: config.baseURL || process.env.FACE_API_URL || 'http://localhost:8001',
      // X-Clientid header value
      clientId: config.clientId || process.env.FACE_API_CLIENT_ID || 'bima',
      facegalleryId: config.facegalleryId || 'kki_exam_browser',
      threshold: config.threshold || 0.75 // Similarity threshold (0.75 = 75%)
    })
    
    this.userDataPath = app.getPath('userData')
    this.registeredUsersPath = path.join(this.userDataPath, 'registered-users.json')
    this.registeredUsers = []
    this.isInitialized = false
  }

  async initialize() {
    if (this.isInitialized) return

    console.log('FaceAPIService: Initializing...')
    
    try {
      // Load registered users list
      await this.loadRegisteredUsers()
      
      this.isInitialized = true
      console.log('FaceAPIService: Initialized successfully')
    } catch (error) {
      console.error('FaceAPIService: Initialization failed:', error)
      throw error
    }
  }

  async loadRegisteredUsers() {
    try {
      const data = await fs.readFile(this.registeredUsersPath, 'utf-8')
      this.registeredUsers = JSON.parse(data)
      console.log(`FaceAPIService: Loaded ${this.registeredUsers.length} registered users`)
    } catch (error) {
      console.log('FaceAPIService: No registered users found')
      this.registeredUsers = []
    }
  }

  async saveRegisteredUsers() {
    try {
      await fs.writeFile(
        this.registeredUsersPath,
        JSON.stringify(this.registeredUsers, null, 2)
      )
      console.log('FaceAPIService: Registered users saved')
    } catch (error) {
      console.error('FaceAPIService: Failed to save registered users:', error)
    }
  }

  /**
   * Register user baru dengan foto
   * @param {string} userId - User ID (eg. NIK)
   * @param {string} userName - Nama user
   * @param {string} imageBase64 - Base64 encoded image
   */
  async registerUser(userId, userName, imageBase64) {
    try {
      console.log(`FaceAPIService: Registering user ${userId} - ${userName}`)
      
      const result = await this.client.registerFace(userId, userName, imageBase64)
      
      if (result.success) {
        // Add to local registered users list
        const existingIndex = this.registeredUsers.findIndex(u => u.userId === userId)
        if (existingIndex >= 0) {
          this.registeredUsers[existingIndex] = {
            userId,
            userName,
            registeredAt: new Date().toISOString()
          }
        } else {
          this.registeredUsers.push({
            userId,
            userName,
            registeredAt: new Date().toISOString()
          })
        }
        
        await this.saveRegisteredUsers()
        
        return {
          success: true,
          message: `User ${userName} registered successfully`,
          userId: userId
        }
      } else {
        return {
          success: false,
          error: result.error,
          statusCode: result.statusCode
        }
      }
    } catch (error) {
      console.error('FaceAPIService: Registration error:', error)
      return {
        success: false,
        error: error.message || 'Registration failed'
      }
    }
  }

  /**
   * Verify user dengan foto (1:1 authentication)
   * @param {string} userId - User ID yang akan diverifikasi
   * @param {string} imageBase64 - Base64 encoded image
   */
  async verifyUser(userId, imageBase64) {
    try {
      console.log(`FaceAPIService: Verifying user ${userId}`)
      
      const result = await this.client.verifyFace(userId, imageBase64)
      
      return {
        success: result.success,
        verified: result.verified,
        similarity: result.similarity,
        hasMask: result.hasMask,
        userName: result.userName,
        message: result.message,
        error: result.error
      }
    } catch (error) {
      console.error('FaceAPIService: Verification error:', error)
      return {
        success: false,
        verified: false,
        error: error.message || 'Verification failed'
      }
    }
  }

  /**
   * Identify user dari foto (1:N authentication)
   * @param {string} imageBase64 - Base64 encoded image
   */
  async identifyUser(imageBase64) {
    try {
      console.log('FaceAPIService: Identifying user from photo')
      
      const result = await this.client.identifyFace(imageBase64)
      
      return {
        success: result.success,
        identified: result.identified,
        userId: result.userId,
        userName: result.userName,
        confidenceLevel: result.confidenceLevel,
        hasMask: result.hasMask,
        message: result.message,
        error: result.error
      }
    } catch (error) {
      console.error('FaceAPIService: Identification error:', error)
      return {
        success: false,
        identified: false,
        error: error.message || 'Identification failed'
      }
    }
  }

  /**
   * Compare 2 images
   * @param {string} sourceImageBase64 - Base64 encoded source image
   * @param {string} targetImageBase64 - Base64 encoded target image
   */
  async compareImages(sourceImageBase64, targetImageBase64) {
    try {
      console.log('FaceAPIService: Comparing two images')
      
      const result = await this.client.compareImages(sourceImageBase64, targetImageBase64)
      
      return {
        success: result.success,
        verified: result.verified,
        similarity: result.similarity,
        hasMask: result.hasMask,
        message: result.message,
        error: result.error
      }
    } catch (error) {
      console.error('FaceAPIService: Comparison error:', error)
      return {
        success: false,
        verified: false,
        error: error.message || 'Comparison failed'
      }
    }
  }

  /**
   * Delete user
   * @param {string} userId - User ID yang akan dihapus
   */
  async deleteUser(userId) {
    try {
      console.log(`FaceAPIService: Deleting user ${userId}`)
      
      const result = await this.client.deleteFace(userId)
      
      if (result.success) {
        // Remove from local registered users list
        this.registeredUsers = this.registeredUsers.filter(u => u.userId !== userId)
        await this.saveRegisteredUsers()
        
        return {
          success: true,
          message: `User ${userId} deleted successfully`
        }
      } else {
        return {
          success: false,
          error: result.error,
          statusCode: result.statusCode
        }
      }
    } catch (error) {
      console.error('FaceAPIService: Deletion error:', error)
      return {
        success: false,
        error: error.message || 'Deletion failed'
      }
    }
  }

  /**
   * Get list of registered users
   */
  getRegisteredUsers() {
    return this.registeredUsers
  }

  /**
   * Check if user is registered
   * @param {string} userId - User ID
   */
  isUserRegistered(userId) {
    return this.registeredUsers.some(u => u.userId === userId)
  }

  destroy() {
    console.log('FaceAPIService: Destroyed')
  }
}

module.exports = { FaceAPIService }
