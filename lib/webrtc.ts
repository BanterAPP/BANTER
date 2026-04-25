import { supabase } from './supabase'

export class WebRTCManager {
  private userId: string
  private broadcastChannel: ReturnType<typeof supabase.channel> | null = null
  private mediaRecorder: MediaRecorder | null = null
  private stream: MediaStream | null = null

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

        // Bruk AudioContext for å dekode og spille uansett nettleser
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
        audioCtx.decodeAudioData(bytes.buffer.slice(0), (decoded) => {
          const source = audioCtx.createBufferSource()
          source.buffer = decoded
          source.connect(audioCtx.destination)
          source.start(0)
          source.onended = () => audioCtx.close()
        }, () => audioCtx.close())
      })
      .subscribe()
  }

  async connectTo(_peerId: string) {}

  async startMic(): Promise<boolean> {
    try {
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

      this.mediaRecorder.start(1000)
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
