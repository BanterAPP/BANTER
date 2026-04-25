'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '@/lib/supabase'
import { getDistanceKm } from '@/lib/geo'
import { WebRTCManager } from '@/lib/webrtc'
import {
  NearbyUser, ChannelState, AppState, ReactionEmoji,
  THUMBS_DOWN_THRESHOLD, BAN_MINUTES, MAX_SPEAK_SECONDS, COOLDOWN_SECONDS,
} from '@/lib/types'
import TopBar from './TopBar'
import SpeakingBanner from './SpeakingBanner'
import UserList from './UserList'
import ReactionLayer from './ReactionLayer'
import ReactionBar from './ReactionBar'
import PTTButton from './PTTButton'
import RadiusBar from './RadiusBar'
import Toast from './Toast'

const HEARTBEAT_MS = 4000

export default function BanterApp({ nick }: { nick: string }) {
  const userId = useRef(uuidv4())
  const webrtc  = useRef<WebRTCManager | null>(null)
  const audioElements = useRef<Map<string, HTMLAudioElement>>(new Map())

  const [radius, setRadius]           = useState(10)
  const [position, setPosition]       = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocErr]    = useState(false)
  const [nearbyUsers, setNearby]      = useState<NearbyUser[]>([])
  const [channel, setChannel]         = useState<ChannelState>({ speaking_user: null, speaking_nick: null, started_at: null })
  const [appState, setAppState]       = useState<AppState>('idle')
  const [speakPct, setSpeakPct]       = useState(0)
  const [coolPct, setCoolPct]         = useState(0)
  const [toast, setToast]             = useState<string | null>(null)
  const [reactions, setReactions]     = useState<{ id: string; emoji: string; x: number }[]>([])
  const [thumbsCount, setThumbsCount] = useState(0)
  const [isBanned, setIsBanned]       = useState(false)
  const [banUntil, setBanUntil]       = useState<Date | null>(null)

  const posRef      = useRef(position)
  const radiusRef   = useRef(radius)
  const appStateRef = useRef(appState)
  posRef.current      = position
  radiusRef.current   = radius
  appStateRef.current = appState

  const speakTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const speakInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const coolInterval  = useRef<ReturnType<typeof setInterval> | null>(null)
  const heartbeat     = useRef<ReturnType<typeof setInterval> | null>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  // 1. Geolocation
  useEffect(() => {
    if (!navigator.geolocation) { setLocErr(true); return }

    navigator.geolocation.getCurrentPosition(
      pos => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocErr(false)
      },
      () => {
        navigator.geolocation.getCurrentPosition(
          pos => {
            setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })
            setLocErr(false)
          },
          () => setLocErr(true),
          { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 }
        )
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 8000 }
    )

    const id = navigator.geolocation.watchPosition(
      pos => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocErr(false)
      },
      () => {},
      { enableHighAccuracy: false, maximumAge: 10000, timeout: 15000 }
    )

    return () => navigator.geolocation.clearWatch(id)
  }, [])

  // 2. Register user + heartbeat
  useEffect(() => {
    if (!position) return
    const uid = userId.current
    const upsert = async () => {
      const pos = posRef.current
      if (!pos) return
      await supabase.from('users').upsert({
        id: uid, nick, lat: pos.lat, lng: pos.lng,
        last_seen: new Date().toISOString(),
      })
    }
    upsert()
    heartbeat.current = setInterval(upsert, HEARTBEAT_MS)
    return () => {
      if (heartbeat.current) clearInterval(heartbeat.current)
      supabase.from('users').delete().eq('id', uid)
    }
  }, [position, nick])

  // 3. WebRTC - med audio element tracking
  useEffect(() => {
    const mgr = new WebRTCManager(userId.current)
    webrtc.current = mgr
    mgr.init()

    mgr.onRemoteStream((peerId, stream) => {
      // Fjern gammel audio element hvis den finnes
      const existing = audioElements.current.get(peerId)
      if (existing) {
        existing.pause()
        existing.srcObject = null
      }

      // Lag ny audio element
      const audio = new window.Audio()
      audio.srcObject = stream
      audio.autoplay = true
      audio.volume = 1.0
      audioElements.current.set(peerId, audio)

      // Forsøk å spille av - håndter autoplay-blokkering
      audio.play().catch(() => {
        // På mobil kreves brukerinteraksjon for autoplay
        // Vi legger til en click-listener
        const resume = () => {
          audio.play().catch(() => {})
          document.removeEventListener('click', resume)
          document.removeEventListener('touchstart', resume)
        }
        document.addEventListener('click', resume)
        document.addEventListener('touchstart', resume)
      })
    })

    mgr.onPeerLeave((peerId) => {
      const audio = audioElements.current.get(peerId)
      if (audio) {
        audio.pause()
        audio.srcObject = null
        audioElements.current.delete(peerId)
      }
    })

    return () => {
      mgr.disconnectAll()
      audioElements.current.forEach(audio => {
        audio.pause()
        audio.srcObject = null
      })
      audioElements.current.clear()
    }
  }, [])

  // 4. Nearby users
  useEffect(() => {
    if (!position) return
    const fetchNearby = async () => {
      const { data } = await supabase
        .from('users').select('*').neq('id', userId.current)
      if (!data) return
      const filtered = data
        .map(u => ({ ...u, distance: getDistanceKm(position.lat, position.lng, u.lat, u.lng) }))
        .filter(u => u.distance <= radiusRef.current)
        .sort((a, b) => a.distance - b.distance) as NearbyUser[]
      setNearby(filtered)
      filtered.forEach(u => webrtc.current?.connectTo(u.id))
    }
    fetchNearby()
    const sub = supabase
      .channel('nearby')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchNearby)
      .subscribe()
    return () => { sub.unsubscribe() }
  }, [position, radius])

  // 5. Channel state
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('channel_state').select('*').eq('id', 'global').single()
      if (data) setChannel(data)
    }
    fetch()
    const sub = supabase
      .channel('channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channel_state', filter: 'id=eq.global' },
        payload => setChannel(payload.new as ChannelState))
      .subscribe()
    return () => { sub.unsubscribe() }
  }, [])

  // 6. Reactions realtime
  useEffect(() => {
    const sub = supabase
      .channel('reactions-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reactions' },
        payload => {
          const { emoji, target_user } = payload.new as { emoji: string; target_user: string }
          if (channel.speaking_user && target_user === channel.speaking_user) {
            spawnEmoji(emoji)
          }
          if (emoji === '👎' && target_user === userId.current) {
            setThumbsCount(prev => {
              const next = prev + 1
              if (next >= THUMBS_DOWN_THRESHOLD) triggerBanOnMe()
              return next
            })
          }
        })
      .subscribe()
    return () => { sub.unsubscribe() }
  }, [channel.speaking_user])

  // 7. Check ban on mount
  useEffect(() => {
    const checkBan = async () => {
      const { data } = await supabase
        .from('bans')
        .select('*')
        .eq('banned_user', userId.current)
        .gt('banned_until', new Date().toISOString())
        .maybeSingle()
      if (data) {
        setIsBanned(true)
        setBanUntil(new Date(data.banned_until))
        setAppState('banned')
      }
    }
    checkBan()
  }, [])

  const spawnEmoji = useCallback((emoji: string) => {
    const id = uuidv4()
    const x = 20 + Math.random() * 280
    setReactions(prev => [...prev, { id, emoji, x }])
    setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 2800)
  }, [])

  const triggerBanOnMe = useCallback(async () => {
    const until = new Date(Date.now() + BAN_MINUTES * 60 * 1000)
    await supabase.from('bans').insert({
      banned_user: userId.current, banned_nick: nick,
      banned_until: until.toISOString(), vote_count: THUMBS_DOWN_THRESHOLD,
    })
    await supabase.from('channel_state').upsert({
      id: 'global', speaking_user: null, speaking_nick: null,
      started_at: null, updated_at: new Date().toISOString(),
    })
    webrtc.current?.stopMic()
    setIsBanned(true)
    setBanUntil(until)
    setAppState('banned')
    showToast(`🚫 Du er utestengt i ${BAN_MINUTES} min`)
  }, [nick, showToast])

  const claimChannel = useCallback(async () => {
    await supabase.from('channel_state').upsert({
      id: 'global', speaking_user: userId.current, speaking_nick: nick,
      started_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    })
  }, [nick])

  const releaseChannel = useCallback(async () => {
    await supabase.from('channel_state').upsert({
      id: 'global', speaking_user: null, speaking_nick: null,
      started_at: null, updated_at: new Date().toISOString(),
    })
  }, [])

  const startSpeaking = useCallback(async () => {
    if (appStateRef.current !== 'idle') return
    if (channel.speaking_user && channel.speaking_user !== userId.current) {
      showToast(`${channel.speaking_nick || 'Noen'} snakker nå – vent litt`)
      return
    }
    if (!posRef.current) { showToast('Venter på GPS...'); return }
    if (isBanned) { showToast(`🚫 Du er utestengt${banUntil ? ` til ${banUntil.toLocaleTimeString('no')}` : ''}`); return }

    const ok = await webrtc.current?.startMic()
    if (!ok) { showToast('Mikrofon ikke tilgjengelig'); return }

    await claimChannel()
    setAppState('speaking')
    setThumbsCount(0)
    setSpeakPct(0)

    let elapsed = 0
    speakInterval.current = setInterval(() => {
      elapsed += 100
      setSpeakPct((elapsed / (MAX_SPEAK_SECONDS * 1000)) * 100)
    }, 100)
    speakTimer.current = setTimeout(() => { stopSpeaking() }, MAX_SPEAK_SECONDS * 1000)
  }, [channel, isBanned, banUntil, claimChannel, showToast])

  const stopSpeaking = useCallback(async () => {
    if (appStateRef.current !== 'speaking') return
    if (speakTimer.current)    clearTimeout(speakTimer.current)
    if (speakInterval.current) clearInterval(speakInterval.current)
    webrtc.current?.stopMic()
    await releaseChannel()
    setAppState('cooldown')
    setSpeakPct(0)
    setCoolPct(0)
    let elapsed = 0
    coolInterval.current = setInterval(() => {
      elapsed += 100
      setCoolPct((elapsed / (COOLDOWN_SECONDS * 1000)) * 100)
      if (elapsed >= COOLDOWN_SECONDS * 1000) {
        clearInterval(coolInterval.current!)
        setAppState('idle')
        setCoolPct(0)
      }
    }, 100)
  }, [releaseChannel])

  const sendReaction = useCallback(async (emoji: ReactionEmoji) => {
    const speakingUser = channel.speaking_user
    if (!speakingUser) return
    if (speakingUser === userId.current) return
    await supabase.from('reactions').insert({
      from_user: userId.current,
      target_user: speakingUser,
      emoji,
    })
    spawnEmoji(emoji)
  }, [channel.speaking_user, spawnEmoji])

  const iAmSpeaking   = channel.speaking_user === userId.current
  const otherSpeaking = !!channel.speaking_user && !iAmSpeaking

  const pttState =
    isBanned        ? 'banned'
    : otherSpeaking ? 'blocked'
    : appState === 'cooldown' ? 'cooldown'
    : appState === 'speaking' ? 'speaking'
    : 'idle'

  const hintText =
    isBanned         ? `Utestengt${banUntil ? ` til ${banUntil.toLocaleTimeString('no')}` : ''}`
    : otherSpeaking  ? 'Kanal opptatt'
    : appState === 'cooldown' ? `Vent ${Math.ceil((1 - coolPct / 100) * COOLDOWN_SECONDS)}s`
    : appState === 'speaking' ? `${Math.ceil((1 - speakPct / 100) * MAX_SPEAK_SECONDS)}s igjen`
    : !position      ? 'Henter posisjon...'
    : 'Hold for å snakke'

  return (
    <div style={{ height:'100dvh', display:'flex', flexDirection:'column', background:'var(--bg)', overflow:'hidden', position:'relative' }}>
      <TopBar nick={nick} radius={radius} hasLocation={!!position} locationError={locationError} />
      <SpeakingBanner iAmSpeaking={iAmSpeaking} otherSpeaking={otherSpeaking} speakingNick={channel.speaking_nick} />

      {(appState === 'speaking' || appState === 'cooldown') && (
        <div style={{ height:3, background:'var(--surface2)', flexShrink:0, overflow:'hidden' }}>
          <div style={{
            height:'100%',
            width: `${appState === 'speaking' ? speakPct : coolPct}%`,
            background: appState === 'cooldown' ? 'linear-gradient(90deg,#f7971e,#ffd200)'
              : speakPct > 75 ? 'linear-gradient(90deg,#f7971e,#ff4e50)'
              : 'linear-gradient(90deg,#43e97b,#38f9d7)',
            transition:'width 0.1s linear, background 0.3s',
          }} />
        </div>
      )}

      <UserList users={nearbyUsers} speakingUserId={channel.speaking_user} />
      <ReactionLayer reactions={reactions} />
      {otherSpeaking && (
        <ReactionBar onReact={sendReaction} thumbsCount={thumbsCount} threshold={THUMBS_DOWN_THRESHOLD} />
      )}
      <PTTButton state={pttState} hintText={hintText} onPressStart={startSpeaking} onPressEnd={stopSpeaking} />
      <RadiusBar selected={radius} onChange={setRadius} />
      {toast && <Toast message={toast} />}
    </div>
  )
}
