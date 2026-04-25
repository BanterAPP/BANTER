import { supabase } from './supabase'

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
]

type OnStream = (peerId: string, stream: MediaStream) => void
type OnLeave  = (peerId: string) => void

export class WebRTCManager {
  private userId: string
  private peers  = new Map<string, RTCPeerConnection>()
  private stream: MediaStream | null = null
  private sub:    ReturnType<typeof supabase.channel> | null = null
  private onStream?: OnStream
  private onLeave?:  OnLeave

  constructor(userId: string) {
    this.userId = userId
  }

  onRemoteStream(cb: OnStream) { this.onStream = cb }
  onPeerLeave(cb: OnLeave)    { this.onLeave  = cb }

  async init() {
    this.sub = supabase
      .channel(`signals:${this.userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signals',
          filter: `to_user=eq.${this.userId}`,
        },
        (payload) => {
          const { from_user, type, data } = payload.new as {
            from_user: string
            type: string
            data: RTCSessionDescriptionInit | RTCIceCandidateInit
          }
          this.handleSignal(from_user, type, data)
        }
      )
      .subscribe()
  }

  private makePc(peerId: string): RTCPeerConnection {
    if (this.peers.has(peerId)) return this.peers.get(peerId)!

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    this.peers.set(peerId, pc)

    pc.onicecandidate = (e) => {
      if (e.candidate) this.signal(peerId, 'ice-candidate', e.candidate.toJSON())
    }

    pc.ontrack = (e) => {
      this.onStream?.(peerId, e.streams[0])
    }

    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        this.removePeer(peerId)
      }
    }

    if (this.stream) {
      this.stream.getTracks().forEach(t => pc.addTrack(t, this.stream!))
    }

    return pc
  }

  async connectTo(peerId: string) {
    if (this.peers.has(peerId)) return
    const pc = this.makePc(peerId)
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    await this.signal(peerId, 'offer', offer)
  }

  private async handleSignal(
    from: string,
    type: string,
    data: RTCSessionDescriptionInit | RTCIceCandidateInit
  ) {
    if (type === 'offer') {
      const pc = this.makePc(from)
      await pc.setRemoteDescription(new RTCSessionDescription(data as RTCSessionDescriptionInit))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      await this.signal(from, 'answer', answer)
    } else if (type === 'answer') {
      const pc = this.peers.get(from)
      if (pc && pc.signalingState !== 'stable') {
        await pc.setRemoteDescription(new RTCSessionDescription(data as RTCSessionDescriptionInit))
      }
    } else if (type === 'ice-candidate') {
      const pc = this.peers.get(from)
      if (pc?.remoteDescription) {
        try { await pc.addIceCandidate(new RTCIceCandidate(data as RTCIceCandidateInit)) } catch {}
      }
    }

    await supabase
      .from('signals')
      .delete()
      .eq('from_user', from)
      .eq('to_user', this.userId)
      .eq('type', type)
  }

  private async signal(
    to: string,
    type: string,
    data: RTCSessionDescriptionInit | RTCIceCandidateInit
  ) {
    await supabase.from('signals').insert({ from_user: this.userId, to_user: to, type, data })
  }

  async startMic(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      this.peers.forEach((pc) => {
        const senders = pc.getSenders()
        this.stream!.getTracks().forEach(track => {
          const existing = senders.find(s => s.track?.kind === track.kind)
          if (existing) existing.replaceTrack(track)
          else          pc.addTrack(track, this.stream!)
        })
      })
      return true
    } catch {
      return false
    }
  }

  stopMic() {
    this.stream?.getTracks().forEach(t => t.stop())
    this.stream = null
    this.peers.forEach(pc => {
      pc.getSenders().forEach(s => {
        if (s.track?.kind === 'audio') pc.removeTrack(s)
      })
    })
  }

  removePeer(peerId: string) {
    const pc = this.peers.get(peerId)
    if (!pc) return
    pc.close()
    this.peers.delete(peerId)
    this.onLeave?.(peerId)
  }

  disconnectAll() {
    this.stopMic()
    this.peers.forEach(pc => pc.close())
    this.peers.clear()
    this.sub?.unsubscribe()
  }
}
