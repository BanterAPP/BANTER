import { supabase } from './supabase'

export class WebRTCManager {
  private userId: string
  private broadcastChannel: ReturnType<typeof supabase.channel> | null = null
  private mediaRecorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private audioQueue: { data: ArrayBuffer; mimeType: string }[] = []
  private isPlaying = false

  constructor(userId: string) {
    this.userId = userId
  }

  onRemoteStream(_peerId: string, _stream: MediaStream) {}
  onPeerLeave(_cb: (peerId: string) => void) {}

  async init() {
    this.broadcastChannel = supabase.channel('audio-broadcast', {
      config: { broadcast: { self: false } }
    })

    this.broadcastChannel
      .on('broadcast', { event: 'audio' }, (payload) => {
        if (payload.payload.from === this.userId) return
        const bytes = Uint8Array.from(atob(payload.payload.data), c => c.charCodeAt(0))
        this.audioQueue.push({
          data: bytes.buffer,
          mimeType: payload.payload.mimeType || 'audio/webm'
        })
        if (!this.isPlaying) this.playNext()
      })
      .subscribe()
  }

  private playNext() {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false
      return
    }
    this.isPlaying = true
    const { data, mimeType } = this.audioQueue.shift()!
    const blob = new Blob([data], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.onended = () => { URL.revokeObjectURL(url); this.playNext() }
    audio.onerror = () => { URL.revokeObjectURL(url); this.playNext() }
    audio.play().catch(() => { URL.revokeObjectURL(url); this.playNext() })
  }

  async connectTo(_peerId: string) {}

  async startMic(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false
      })

      // Safari bruker mp4, Android/Chrome bruker webm
      const mimeType =
        MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
        MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' :
        MediaRecorder.isTypeSupported('audio/mp4;codecs=mp4a') ? 'audio/mp4;codecs=mp4a' :
        'audio/mp4'

      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType })

      this.mediaRecorder.ondataavailable = async (e) => {
        if (e.data.size < 50) return
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

      this.mediaRecorder.start(300)
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
  }
}
