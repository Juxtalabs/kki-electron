const path = require('path')
const fs = require('fs').promises

/**
 * Read all photos from directory and return as base64 data
 * The actual descriptor extraction will be done in renderer process
 */
async function readPhotosFromDirectory(photosDir) {
  try {
    console.log(`PhotoReader: Reading photos from ${photosDir}`)
    
    // Check if directory exists
    try {
      await fs.access(photosDir)
    } catch (error) {
      console.log(`PhotoReader: Directory ${photosDir} not found`)
      return []
    }
    
    // Get all image files
    const files = await fs.readdir(photosDir)
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase()
      return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)
    })
    
    if (imageFiles.length === 0) {
      console.log('PhotoReader: No image files found')
      return []
    }
    
    console.log(`PhotoReader: Found ${imageFiles.length} image files`)
    
    // Read each file as base64
    const photos = []
    for (const file of imageFiles) {
      try {
        const filePath = path.join(photosDir, file)
        const buffer = await fs.readFile(filePath)
        const base64 = buffer.toString('base64')
        const ext = path.extname(file).toLowerCase().substring(1)
        const mimeType = ext === 'jpg' ? 'jpeg' : ext
        
        photos.push({
          fileName: file,
          data: `data:image/${mimeType};base64,${base64}`
        })
        
        console.log(`PhotoReader: Read ${file} (${(buffer.length / 1024).toFixed(2)} KB)`)
      } catch (error) {
        console.error(`PhotoReader: Failed to read ${file}:`, error.message)
      }
    }
    
    console.log(`PhotoReader: Successfully read ${photos.length} photos`)
    return photos
  } catch (error) {
    console.error('PhotoReader: Error:', error)
    return []
  }
}

module.exports = { readPhotosFromDirectory }
