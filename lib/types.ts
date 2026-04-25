export type NearbyUser = {
  id: string
  nick: string
  lat: number
  lng: number
  distance: number
  last_seen: string
}

export type ChannelState = {
  speaking_user: string | null
  speaking_nick: string | null
  started_at: string | null
}

export type AppState = 'idle' | 'speaking' | 'cooldown' | 'blocked' | 'banned'

export type ReactionEmoji = '😂' | '🔥' | '❤️' | '👎'

export const REACTION_EMOJIS: ReactionEmoji[] = ['😂', '🔥', '❤️', '👎']
export const THUMBS_DOWN_THRESHOLD = 5
export const BAN_MINUTES = 30
export const MAX_SPEAK_SECONDS = 15
export const COOLDOWN_SECONDS = 5
