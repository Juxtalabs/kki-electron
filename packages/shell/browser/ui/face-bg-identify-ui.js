const IDENTIFY_INTERVAL_MS = 30 * 1000

class FaceBgIdentify {
  constructor() {
    this.canvas = document.getElementById('bg-canvas')
    this.ctx = this.canvas.getContext('2d')
    this.stream = null
    this.timer = null
    this.init()
  }

  async init() {
    if (window.faceBg) await window.faceBg.initialize()
    await this.startCamera()
  }

  async startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      })
      this.stream = stream
      document.getElementById('bg-video').srcObject = stream
      this.startLoop()
    } catch (error) {
      console.error('FaceBgIdentify: camera error:', error.message)
    }
  }

  startLoop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = setInterval(() => this.identify(), IDENTIFY_INTERVAL_MS)
  }

  captureImage() {
    const video = document.getElementById('bg-video')
    this.canvas.width = video.videoWidth
    this.canvas.height = video.videoHeight
    this.ctx.drawImage(video, 0, 0)
    return this.canvas.toDataURL('image/jpeg', 0.9).split(',')[1]
  }

  async identify() {
    if (!this.stream) return
    try {
      const imageBase64 = this.captureImage()
      const result = await window.faceBg.identify(imageBase64)
      if (result.success && result.identified) {
        window.faceBg.notifyResult(true, result.userName)
      } else {
        window.faceBg.notifyResult(false, null)
      }
    } catch (error) {
      console.error('FaceBgIdentify: identify error:', error.message)
      window.faceBg.notifyResult(false, null)
    }
  }
}

new FaceBgIdentify()
