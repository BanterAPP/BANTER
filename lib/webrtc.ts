import { supabase } from './supabase'

export class WebRTCManager {
  private userId: string
  private broadcastChannel: ReturnType<typeof supabase.channel> | null = null
  private mediaRecorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private chunks: Blob[] = []

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
        const mimeType = payload.payload.mimeType || 'audio/webm'
        const blob = new Blob([bytes.buffer], { type: mimeType })
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audio.play().catch(() => {})
        audio.onended = () => URL.revokeObjectURL(url)
      })
      .subscribe()
  }

  async connectTo(_peerId: string) {}

  async startMic(): Promise<boolean> {
    try {
      this.chunks = []
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false
      })

      const mimeType =
        MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
        MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' :
        MediaRecorder.isTypeSupported('audio/mp4;codecs=mp4a') ? 'audio/mp4;codecs=mp4a' :
        'audio/mp4'

      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType })

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data)
      }

      // Når opptaket stopper, send hele lydfilen
      this.mediaRecorder.onstop = async () => {
        if (this.chunks.length === 0) return

        const mimeUsed = this.mediaRecorder?.mimeType || mimeType
        const blob = new Blob(this.chunks, { type: mimeUsed })
        this.chunks = []

        // Supabase Realtime har 1MB grense – sjekk størrelse
        if (blob.size > 900000) return

        const buffer = await blob.arrayBuffer()
        const bytes = new Uint8Array(buffer)
        let binary = ''
        bytes.forEach(b => { binary += String.fromCharCode(b) })
        const base64 = btoa(binary)

        this.broadcastChannel?.send({
          type: 'broadcast',
          event: 'audio',
          payload: { from: this.userId, data: base64, mimeType: mimeUsed },
        })
      }

      this.mediaRecorder.start()
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
