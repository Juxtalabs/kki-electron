const AUTO_IDENTIFY_INTERVAL = 30

class FaceAPIPanelUI {
  constructor() {
    this.panel = document.getElementById('face-api-panel')
    this.canvas = document.getElementById('capture-canvas')
    this.ctx = this.canvas.getContext('2d')
    this.stream = null
    this.autoTimer = null
    this.countdownTimer = null
    this.secondsLeft = AUTO_IDENTIFY_INTERVAL

    this.init()
  }

  async init() {
    document.getElementById('close-panel').addEventListener('click', () => this.closePanel())

    if (window.faceAPI) {
      await window.faceAPI.initialize()
    }

    await this.startCamera()
  }

  async startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      })

      this.stream = stream
      const video = document.getElementById('identify-video')
      const overlay = document.getElementById('identify-video-overlay')

      video.srcObject = stream
      overlay.style.display = 'none'

      this.startAutoIdentify()
    } catch (error) {
      console.error('FaceAPIPanelUI: Failed to start camera:', error)
      const overlay = document.getElementById('identify-video-overlay')
      overlay.textContent = 'Camera unavailable'
      this.showStatus(`Failed to start camera: ${error.message}`, 'error')
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null

      const video = document.getElementById('identify-video')
      const overlay = document.getElementById('identify-video-overlay')
      video.srcObject = null
      overlay.style.display = 'flex'
      overlay.textContent = 'Camera Off'
    }
    this.stopAutoIdentify()
  }

  startAutoIdentify() {
    this.stopAutoIdentify()
    this.secondsLeft = AUTO_IDENTIFY_INTERVAL

    // Run once immediately, then every 30s
    this.handleIdentify()

    this.autoTimer = setInterval(() => {
      this.secondsLeft = AUTO_IDENTIFY_INTERVAL
      this.handleIdentify()
    }, AUTO_IDENTIFY_INTERVAL * 1000)

    this.countdownTimer = setInterval(() => {
      this.secondsLeft--
      this.updateCountdown()
    }, 1000)
  }

  stopAutoIdentify() {
    if (this.autoTimer) {
      clearInterval(this.autoTimer)
      this.autoTimer = null
    }
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
      this.countdownTimer = null
    }
    this.updateCountdown(true)
  }

  updateCountdown(stopped = false) {
    const el = document.getElementById('identify-countdown')
    if (!el) return
    el.textContent = stopped ? '' : `Next scan in ${this.secondsLeft}s`
  }

  captureImage() {
    const video = document.getElementById('identify-video')
    this.canvas.width = video.videoWidth
    this.canvas.height = video.videoHeight
    this.ctx.drawImage(video, 0, 0)
    const dataURL = this.canvas.toDataURL('image/jpeg', 0.9)
    return dataURL.split(',')[1]
  }

  async handleIdentify() {
    if (!this.stream) return

    try {
      this.showStatus('Identifying...', 'info')
      this.secondsLeft = AUTO_IDENTIFY_INTERVAL

      const imageBase64 = this.captureImage()
      const result = await window.faceAPI.identifyUser(imageBase64)

      const resultBox = document.getElementById('identify-result')
      const userNameText = document.getElementById('identify-user-name')
      const userIdText = document.getElementById('identify-user-id')
      const confidenceText = document.getElementById('identify-confidence')

      resultBox.style.display = 'block'

      if (result.success && result.identified) {
        this.showStatus('✓ User identified!', 'success')
        userNameText.textContent = result.userName
        userNameText.className = 'result-value verified'
        userIdText.textContent = result.userId
        confidenceText.textContent = `${(result.confidenceLevel * 100).toFixed(2)}%`
      } else {
        this.showStatus('✗ No matching user found', 'error')
        userNameText.textContent = 'Unknown'
        userNameText.className = 'result-value failed'
        userIdText.textContent = 'N/A'
        confidenceText.textContent = 'N/A'
      }

      if (result.hasMask) {
        this.showStatus('⚠️ Mask detected - please remove mask', 'error')
      }
    } catch (error) {
      console.error('FaceAPIPanelUI: Identification error:', error)
      this.showStatus(`Error: ${error.message}`, 'error')
    }
  }

  showStatus(message, type) {
    const statusEl = document.getElementById('identify-status')
    statusEl.textContent = message
    statusEl.className = `status-message active ${type}`

    if (type === 'success' || type === 'info') {
      setTimeout(() => statusEl.classList.remove('active'), 5000)
    }
  }

  openPanel() {
    this.panel.classList.add('active')
    if (!this.stream) {
      this.startCamera()
    }
  }

  closePanel() {
    this.panel.classList.remove('active')
    this.stopCamera()
  }
}

const faceAPIPanelUI = new FaceAPIPanelUI()
window.faceAPIPanelUI = faceAPIPanelUI
