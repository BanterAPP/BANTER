'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '@/lib/supabase'
import { getDistanceKm, RADIUS_OPTIONS } from '@/lib/geo'
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
    const id = navigator.geolocation.watchPosition(
      pos => { setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocErr(false) },
      ()  => setLocErr(true),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
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

  // 3. WebRTC
  useEffect(() => {
    const mgr = new WebRTCManager(userId.current)
    webrtc.current = mgr
    mgr.init()
    mgr.onRemoteStream((_peerId, stream) => {
      const audio = new window.Audio()
      audio.srcObject = stream
      audio.autoplay = true
      audio.play().catch(() => {})
    })
    return () => { mgr.disconnectAll() }
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
      filtered.forEach(u => webrtc.current?.connectTo
