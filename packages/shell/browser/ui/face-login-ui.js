const AUTO_IDENTIFY_INTERVAL = 1

class FaceLoginUI {
  constructor() {
    this.canvas = document.getElementById('capture-canvas')
    this.ctx = this.canvas.getContext('2d')
    this.stream = null
    this.autoTimer = null
    this.countdownTimer = null
    this.secondsLeft = AUTO_IDENTIFY_INTERVAL
    this.loginSuccessful = false

    this.init()
  }

  async init() {
    if (window.faceLogin) {
      await window.faceLogin.initialize()
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
      const video = document.getElementById('login-video')
      const overlay = document.getElementById('camera-overlay')

      video.srcObject = stream
      overlay.style.display = 'none'

      this.startAutoIdentify()
    } catch (error) {
      document.getElementById('camera-overlay').textContent = 'Kamera tidak tersedia'
      this.showStatus('Gagal mengakses kamera: ' + error.message, 'error')
    }
  }

  startAutoIdentify() {
    this.stopAutoIdentify()
    this.secondsLeft = AUTO_IDENTIFY_INTERVAL

    this.handleIdentify()

    this.autoTimer = setInterval(() => {
      this.secondsLeft = AUTO_IDENTIFY_INTERVAL
      this.handleIdentify()
    }, AUTO_IDENTIFY_INTERVAL * 1000)

    this.countdownTimer = setInterval(() => {
      if (this.secondsLeft > 0 && !this.loginSuccessful) {
        this.secondsLeft--
        this.updateCountdown()
      }
    }, 1000)
  }

  stopAutoIdentify() {
    if (this.autoTimer) { clearInterval(this.autoTimer); this.autoTimer = null }
    if (this.countdownTimer) { clearInterval(this.countdownTimer); this.countdownTimer = null }
  }

  updateCountdown() {
    const el = document.getElementById('countdown-text')
    if (el) el.textContent = `Scan berikutnya dalam ${this.secondsLeft}s`
  }

  captureImage() {
    const video = document.getElementById('login-video')
    this.canvas.width = video.videoWidth
    this.canvas.height = video.videoHeight
    this.ctx.drawImage(video, 0, 0)
    return this.canvas.toDataURL('image/jpeg', 0.9).split(',')[1]
  }

  setCameraState(state) {
    const wrapper = document.getElementById('camera-wrapper')
    wrapper.className = 'camera-wrapper ' + (state || '')
  }

  async handleIdentify() {
    if (!this.stream || this.loginSuccessful) return

    try {
      this.setCameraState('scanning')
      this.showStatus('Memindai wajah...', 'info')
      this.secondsLeft = AUTO_IDENTIFY_INTERVAL

      const imageBase64 = this.captureImage()
      const result = await window.faceLogin.identify(imageBase64)

      if (result.success && result.identified) {
        this.loginSuccessful = true
        this.stopAutoIdentify()
        this.setCameraState('success')
        document.getElementById('countdown-text').textContent = ''
        this.showStatus(`Selamat datang, ${result.userName}!`, 'success')

        setTimeout(() => {
          window.faceLogin.notifySuccess()
        }, 1500)
      } else {
        this.setCameraState('failed')
        this.showStatus('Wajah tidak dikenali', 'error')
        this.secondsLeft = AUTO_IDENTIFY_INTERVAL
        this.updateCountdown()

        // Reset to neutral state after showing failed
        setTimeout(() => {
          if (!this.loginSuccessful) this.setCameraState('')
        }, 2000)
      }
    } catch (error) {
      this.setCameraState('failed')
      this.showStatus('Error: ' + error.message, 'error')
      setTimeout(() => {
        if (!this.loginSuccessful) this.setCameraState('')
      }, 2000)
    }
  }

  showStatus(message, type) {
    const el = document.getElementById('status-text')
    el.textContent = message
    el.className = type || ''
  }
}

const faceLoginUI = new FaceLoginUI()
window.faceLoginUI = faceLoginUI
