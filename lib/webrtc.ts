import { supabase } from './supabase'

export class WebRTCManager {
  private userId: string
  private broadcastChannel: ReturnType<typeof supabase.channel> | null = null
  private mediaRecorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private sourceBuffer: SourceBuffer | null = null
  private mediaSource: MediaSource | null = null
  private audioElement: HTMLAudioElement | null = null
  private pendingChunks: ArrayBuffer[] = []
  private isAppending = false

  constructor(userId: string) {
    this.userId = userId
  }

  onRemoteStream(_peerId: string, _stream: MediaStream) {}
  onPeerLeave(_cb: (peerId: string) => void) {}

  async init() {
    this.setupMediaSource()

    this.broadcastChannel = supabase.channel('audio-broadcast', {
      config: { broadcast: { self: false } }
    })

    this.broadcastChannel
      .on('broadcast', { event: 'audio' }, (payload) => {
        if (payload.payload.from === this.userId) return
        const bytes = Uint8Array.from(atob(payload.payload.data), c => c.charCodeAt(0))
        this.appendChunk(bytes.buffer)
      })
      .subscribe()
  }

  private setupMediaSource() {
    if (!window.MediaSource) return

    this.mediaSource = new MediaSource()
    this.audioElement = new Audio()
    this.audioElement.src = URL.createObjectURL(this.mediaSource)
    this.audioElement.autoplay = true

    this.mediaSource.addEventListener('sourceopen', () => {
      const mimeType = MediaSource.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      try {
        this.sourceBuffer = this.mediaSource!.addSourceBuffer(mimeType)
        this.sourceBuffer.mode = 'sequence'
        this.sourceBuffer.addEventListener('updateend', () => {
          this.isAppending = false
          this.processQueue()
        })
      } catch {
        this.sourceBuffer = null
      }
    })

    this.audioElement.play().catch(() => {
      document.addEventListener('click', () => this.audioElement?.play().catch(() => {}), { once: true })
      document.addEventListener('touchstart', () => this.audioElement?.play().catch(() => {}), { once: true })
    })
  }

  private appendChunk(buffer: ArrayBuffer) {
    this.pendingChunks.push(buffer)
    this.processQueue()
  }

  private processQueue() {
    if (this.isAppending) return
    if (!this.sourceBuffer || this.sourceBuffer.updating) return
    if (this.pendingChunks.length === 0) return

    this.isAppending = true
    const chunk = this.pendingChunks.shift()!
    try {
      this.sourceBuffer.appendBuffer(chunk)
    } catch {
      this.isAppending = false
    }
  }

  async connectTo(_peerId: string) {}

  async startMic(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
        video: false
      })

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'

      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType })

      this.mediaRecorder.ondataavailable = async (e) => {
        if (e.data.size < 100) return
        const buffer = await e.data.arrayBuffer()
        const bytes = new Uint8Array(buffer)
        let binary = ''
        bytes.forEach(b => { binary += String.fromCharCode(b) })
        const base64 = btoa(binary)

        this.broadcastChannel?.send({
          type: 'broadcast',
          event: 'audio',
          payload: { from: this.userId, data: base64, mimeType },
        })
      }

      this.mediaRecorder.start(100)
      return true
    } catch {
      return false
    }
  }

  stopMic() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop()
    }
    this.mediaRecorder = null
    this.stream?.getTracks().forEach(t => t.stop())
    this.stream = null
  }

  removePeer(_peerId: string) {}

  disconnectAll() {
    this.stopMic()
    this.broadcastChannel?.unsubscribe()
    if (this.audioElement) {
      this.audioElement.pause()
      this.audioElement.src = ''
    }
  }
}
