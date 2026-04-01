const https = require('https')
const fs = require('fs')
const path = require('path')
const { app } = require('electron')

// Model files yang diperlukan untuk face-api.js
const MODELS = {
  tinyFaceDetector: [
    'tiny_face_detector_model-weights_manifest.json',
    'tiny_face_detector_model-shard1'
  ],
  faceLandmark68: [
    'face_landmark_68_model-weights_manifest.json',
    'face_landmark_68_model-shard1'
  ],
  faceRecognition: [
    'face_recognition_model-weights_manifest.json',
    'face_recognition_model-shard1',
    'face_recognition_model-shard2'
  ]
}

const BASE_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/'

async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath)
    
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file)
        file.on('finish', () => {
          file.close()
          console.log(`Downloaded: ${path.basename(destPath)}`)
          resolve()
        })
      } else {
        fs.unlink(destPath, () => {})
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`))
      }
    }).on('error', (err) => {
      fs.unlink(destPath, () => {})
      reject(err)
    })
  })
}

async function downloadModels() {
  try {
    // Tentukan path untuk models
    const userDataPath = app ? app.getPath('userData') : path.join(__dirname, '..', 'face-models')
    const modelsPath = path.join(userDataPath, 'face-models')
    
    // Buat folder jika belum ada
    if (!fs.existsSync(modelsPath)) {
      fs.mkdirSync(modelsPath, { recursive: true })
      console.log(`Created models directory: ${modelsPath}`)
    }
    
    console.log('Downloading face-api.js models...')
    console.log(`Target directory: ${modelsPath}`)
    
    // Download semua model files
    const allFiles = [
      ...MODELS.tinyFaceDetector,
      ...MODELS.faceLandmark68,
      ...MODELS.faceRecognition
    ]
    
    for (const file of allFiles) {
      const url = BASE_URL + file
      const destPath = path.join(modelsPath, file)
      
      // Skip jika file sudah ada
      if (fs.existsSync(destPath)) {
        console.log(`Skipped (already exists): ${file}`)
        continue
      }
      
      console.log(`Downloading: ${file}...`)
      await downloadFile(url, destPath)
    }
    
    console.log('\n✓ All models downloaded successfully!')
    console.log(`Models location: ${modelsPath}`)
    
    return modelsPath
  } catch (error) {
    console.error('Error downloading models:', error)
    throw error
  }
}

// Jika dijalankan langsung (bukan sebagai module)
if (require.main === module) {
  downloadModels()
    .then(() => {
      console.log('Done!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Failed:', error)
      process.exit(1)
    })
}

module.exports = { downloadModels }
