import { supabase } from './supabase'

type OnAudio = (blob: Blob) => void

export class WebRTCManager {
  private userId: string
  private sub: ReturnType<typeof supabase.channel> | null = null
  private mediaRecorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private onAudioCallback?: OnAudio

  constructor(userId: string) {
    this.userId = userId
  }

  onRemoteStream(_peerId: string, _stream: MediaStream) {}
  onPeerLeave(_cb: (peerId: string) => void) {}

  async init() {
    // Lytt på lyd-chunks fra andre brukere
    this.sub = supabase
      .channel('audio-broadcast')
      .on('broadcast', { event: 'audio' }, (payload) => {
        if (payload.payload.from === this.userId) return
        const audioData = payload.payload.data
        const blob = new Blob([Uint8Array.from(atob(audioData), c => c.charCodeAt(0))], { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audio.play().catch(() => {})
        setTimeout(() => URL.revokeObjectURL(url), 5000)
      })
      .subscribe()
  }

  async connectTo(_peerId: string) {
    // Ikke nødvendig med broadcast-tilnærming
  }

  async startMic(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        audioBitsPerSecond: 32000,
      })

      this.mediaRecorder.ondataavailable = async (e) => {
        if (e.data.size === 0) return
        // Konverter til base64 og send via Supabase Realtime
        const buffer = await e.data.arrayBuffer()
        const bytes = new Uint8Array(buffer)
        let binary = ''
        bytes.forEach(b => binary += String.fromCharCode(b))
        const base64 = btoa(binary)

        await supabase.channel('audio-broadcast').send({
          type: 'broadcast',
          event: 'audio',
          payload: { from: this.userId, data: base64 },
        })
      }

      this.mediaRecorder.start(200) // Send chunk hvert 200ms
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
    this.sub?.unsubscribe()
  }
}
