const { net } = require('electron')

/**
 * Client untuk Face Recognition REST API
 * Mendukung register, verify, identify, dan compare faces
 */
class FaceAPIClient {
  constructor(config = {}) {
    this.baseURL = config.baseURL || 'https://api.example.com' // Ganti dengan URL API yang sebenarnya
    this.clientId = config.clientId || 'absensi_live'
    this.facegalleryId = config.facegalleryId || 'kki_exam_browser'
    this.threshold = config.threshold || 0.75 // Similarity threshold untuk verification
  }

  /**
   * Helper untuk membuat HTTP request
   */
  async makeRequest(method, endpoint, body = null) {
    return new Promise((resolve, reject) => {
      const url = `${this.baseURL}${endpoint}`
      
      const request = net.request({
        method: method,
        url: url,
        headers: {
          'Content-Type': 'application/json',
          'X-Clientid': this.clientId
        }
      })

      let responseData = ''

      request.on('response', (response) => {
        response.on('data', (chunk) => {
          responseData += chunk.toString()
        })

        response.on('end', () => {
          // Coba parse sebagai JSON terlebih dahulu
          try {
            const data = JSON.parse(responseData)

            if (response.statusCode >= 200 && response.statusCode < 300) {
              resolve({
                success: true,
                statusCode: response.statusCode,
                data
              })
            } else {
              resolve({
                success: false,
                statusCode: response.statusCode,
                error: data.status_message || 'Request failed',
                data
              })
            }
          } catch (error) {
            // Jika bukan JSON murni, jangan throw; log dan kirim raw response
            console.error('FaceAPIClient: Failed to parse response as JSON:', {
              message: error.message,
              rawResponseSample: responseData.slice(0, 200)
            })

            resolve({
              success: false,
              statusCode: response.statusCode,
              error: 'Failed to parse response',
              details: error.message,
              rawResponse: responseData
            })
          }
        })
      })

      request.on('error', (error) => {
        reject({
          success: false,
          error: 'Network error',
          details: error.message
        })
      })

      if (body) {
        request.write(JSON.stringify(body))
      }

      request.end()
    })
  }

  /**
   * Register wajah user baru ke facegallery
   * @param {string} userId - Unique user identifier (eg. NIK)
   * @param {string} userName - Nama user
   * @param {string} imageBase64 - Base64 encoded JPG/PNG image
   * @param {string} trxId - Transaction ID untuk logging
   */
  async registerFace(userId, userName, imageBase64, trxId = null) {
    try {
      console.log(`FaceAPIClient: Registering face for user ${userId}...`)
      
      const body = {
        user_id: userId,
        user_name: userName,
        facegallery_id: this.facegalleryId,
        image: imageBase64,
        trx_id: trxId || `reg_${Date.now()}_${userId}`
      }

      const result = await this.makeRequest('POST', '/facegallery/register-face', body)
      
      if (result.success) {
        console.log(`FaceAPIClient: User ${userId} registered successfully`)
        return {
          success: true,
          message: 'Face registered successfully',
          data: result.data
        }
      } else {
        console.error(`FaceAPIClient: Registration failed - ${result.error}`)
        return {
          success: false,
          error: result.error,
          statusCode: result.statusCode,
          data: result.data
        }
      }
    } catch (error) {
      console.error('FaceAPIClient: Registration error:', error)
      return {
        success: false,
        error: error.error || 'Registration failed',
        details: error.details
      }
    }
  }

  /**
   * Verify wajah user (1:1 authentication)
   * Membandingkan foto yang di-capture dengan foto registered user
   * @param {string} userId - User ID yang akan diverifikasi
   * @param {string} imageBase64 - Base64 encoded JPG/PNG image untuk diverifikasi
   * @param {string} trxId - Transaction ID untuk logging
   */
  async verifyFace(userId, imageBase64, trxId = null) {
    try {
      console.log(`FaceAPIClient: Verifying face for user ${userId}...`)
      
      const body = {
        user_id: userId,
        facegallery_id: this.facegalleryId,
        image: imageBase64,
        trx_id: trxId || `verify_${Date.now()}_${userId}`
      }

      const result = await this.makeRequest('POST', '/facegallery/verify-face', body)
      
      if (result.success) {
        const verified = result.data.verified || false
        const similarity = result.data.similarity || 0
        const hasMask = result.data.masker || false
        
        console.log(`FaceAPIClient: Verification result - Verified: ${verified}, Similarity: ${similarity}, Mask: ${hasMask}`)
        
        return {
          success: true,
          verified: verified,
          similarity: similarity,
          hasMask: hasMask,
          userName: result.data.user_name,
          message: verified ? 'Face verified successfully' : 'Face verification failed',
          data: result.data
        }
      } else {
        console.error(`FaceAPIClient: Verification failed - ${result.error}`)
        return {
          success: false,
          verified: false,
          error: result.error,
          statusCode: result.statusCode,
          data: result.data
        }
      }
    } catch (error) {
      console.error('FaceAPIClient: Verification error:', error)
      return {
        success: false,
        verified: false,
        error: error.error || 'Verification failed',
        details: error.details
      }
    }
  }

  /**
   * Identify wajah (1:N authentication)
   * Mencari user yang cocok dari semua registered users di facegallery
   * @param {string} imageBase64 - Base64 encoded JPG/PNG image
   * @param {string} trxId - Transaction ID untuk logging
   */
  async identifyFace(imageBase64, trxId = null) {
    try {
      console.log('FaceAPIClient: Identifying face...')
      
      const body = {
        facegallery_id: this.facegalleryId,
        image: imageBase64,
        trx_id: trxId || `identify_${Date.now()}`
      }

      const result = await this.makeRequest('POST', '/facegallery/identify-face', body)
      
      if (result.success) {
        const confidenceLevel = result.data.confidence_level || 0
        const hasMask = result.data.mask || false
        const userId = result.data.user_id
        const userName = result.data.user_name
        
        console.log(`FaceAPIClient: Identified - User: ${userName} (${userId}), Confidence: ${confidenceLevel}, Mask: ${hasMask}`)
        
        return {
          success: true,
          identified: !!userId,
          userId: userId,
          userName: userName,
          confidenceLevel: confidenceLevel,
          hasMask: hasMask,
          message: userId ? `Identified as ${userName}` : 'No matching user found',
          data: result.data
        }
      } else {
        console.error(`FaceAPIClient: Identification failed - ${result.error}`)
        return {
          success: false,
          identified: false,
          error: result.error,
          statusCode: result.statusCode,
          data: result.data
        }
      }
    } catch (error) {
      console.error('FaceAPIClient: Identification error:', error)
      return {
        success: false,
        identified: false,
        error: error.error || 'Identification failed',
        details: error.details
      }
    }
  }

  /**
   * Compare 2 images tanpa menggunakan database
   * @param {string} sourceImageBase64 - Base64 encoded JPG/PNG (image yang di-compare)
   * @param {string} targetImageBase64 - Base64 encoded JPG/PNG (reference image)
   * @param {string} trxId - Transaction ID untuk logging
   */
  async compareImages(sourceImageBase64, targetImageBase64, trxId = null) {
    try {
      console.log('FaceAPIClient: Comparing images...')
      
      const body = {
        source_image: sourceImageBase64,
        target_image: targetImageBase64,
        trx_id: trxId || `compare_${Date.now()}`
      }

      const result = await this.makeRequest('POST', '/compare-images', body)
      
      if (result.success) {
        const verified = result.data.verified || false
        const similarity = result.data.similarity || 0
        const hasMask = result.data.masker || false
        
        console.log(`FaceAPIClient: Comparison result - Verified: ${verified}, Similarity: ${similarity}, Mask: ${hasMask}`)
        
        return {
          success: true,
          verified: verified,
          similarity: similarity,
          hasMask: hasMask,
          message: verified ? 'Images match' : 'Images do not match',
          data: result.data
        }
      } else {
        console.error(`FaceAPIClient: Comparison failed - ${result.error}`)
        return {
          success: false,
          verified: false,
          error: result.error,
          statusCode: result.statusCode,
          data: result.data
        }
      }
    } catch (error) {
      console.error('FaceAPIClient: Comparison error:', error)
      return {
        success: false,
        verified: false,
        error: error.error || 'Comparison failed',
        details: error.details
      }
    }
  }

  /**
   * Delete user dari facegallery
   * @param {string} userId - User ID yang akan dihapus
   * @param {string} trxId - Transaction ID untuk logging
   */
  async deleteFace(userId, trxId = null) {
    try {
      console.log(`FaceAPIClient: Deleting face for user ${userId}...`)
      
      const body = {
        user_id: userId,
        facegallery_id: this.facegalleryId,
        trx_id: trxId || `delete_${Date.now()}_${userId}`
      }

      const result = await this.makeRequest('DELETE', '/facegallery/delete-face', body)
      
      if (result.success) {
        console.log(`FaceAPIClient: User ${userId} deleted successfully`)
        return {
          success: true,
          message: 'Face deleted successfully',
          data: result.data
        }
      } else {
        console.error(`FaceAPIClient: Deletion failed - ${result.error}`)
        return {
          success: false,
          error: result.error,
          statusCode: result.statusCode,
          data: result.data
        }
      }
    } catch (error) {
      console.error('FaceAPIClient: Deletion error:', error)
      return {
        success: false,
        error: error.error || 'Deletion failed',
        details: error.details
      }
    }
  }

  /**
   * Helper untuk convert canvas/image ke base64
   * @param {HTMLCanvasElement|HTMLImageElement|HTMLVideoElement} element
   * @returns {string} Base64 string tanpa prefix "data:image/jpeg;base64,"
   */
  static elementToBase64(element) {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    canvas.width = element.videoWidth || element.width
    canvas.height = element.videoHeight || element.height
    
    ctx.drawImage(element, 0, 0)
    
    // Get base64 dan remove prefix
    const dataURL = canvas.toDataURL('image/jpeg', 0.9)
    return dataURL.split(',')[1]
  }
}

module.exports = { FaceAPIClient }
