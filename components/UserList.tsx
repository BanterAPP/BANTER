'use client'

import { NearbyUser } from '@/lib/types'

const AVATARS = [
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#fa709a,#fee140)',
  'linear-gradient(135deg,#a18cd1,#fbc2eb)',
]

function initials(nick: string) {
  const parts = nick.split(/[_\-\s]/).filter(Boolean)
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : nick.slice(0, 2).toUpperCase()
}

function avatarGradient(nick: string) {
  let hash = 0
  for (const c of nick) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  return AVATARS[Math.abs(hash) % AVATARS.length]
}

type Props = {
  users: NearbyUser[]
  speakingUserId: string | null
}

export default function UserList({ users, speakingUserId }: Props) {
  return (
    <div style={{ flex:1, padding:'4px 16px 6px', overflowY:'auto' }}>
      {users.length === 0 ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, padding:'32px 24px', textAlign:'center' }}>
          <div style={{ width:56, height:56, background:'var(--surface2)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, marginBottom:4 }}>📡</div>
          <p style={{ fontSize:15, fontWeight:700, color:'rgba(255,255,255,0.7)' }}>Ingen i nærheten</p>
          <p style={{ fontSize:13, color:'var(--text-dim)' }}>Prøv å øke rekkevidden</p>
        </div>
      ) : (
        <>
          <p style={{ fontSize:12, fontWeight:600, color:'var(--text-dim)', marginBottom:10 }}>
            {users.length} i nærheten
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {users.map(user => {
              const speaking = speakingUserId === user.id
              return (
                <div key={user.id} style={{
                  background: speaking ? 'rgba(255,78,80,0.08)' : 'var(--surface)',
                  borderRadius:14, padding:'12px 16px',
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  border:`1px solid ${speaking ? 'rgba(255,78,80,0.25)' : 'var(--border)'}`,
                  transition:'all 0.2s',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:38, height:38, borderRadius:'50%', background:avatarGradient(user.nick), display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'white', flexShrink:0 }}>
                      {initials(user.nick)}
                    </div>
                    <div>
                      <p style={{ fontSize:14, fontWeight:600 }}>{user.nick}</p>
                      <p style={{ fontSize:12, color:'var(--text-dim)' }}>{user.distance.toFixed(1)} km unna</p>
                    </div>
                  </div>
                  {speaking && (
                    <div style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(255,78,80,0.15)', padding:'5px 10px', borderRadius:20, border:'1px solid rgba(255,78,80,0.3)' }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)', animation:'pulse-dot 0.6s ease-in-out infinite' }} />
                      <span style={{ fontSize:11, fontWeight:600, color:'var(--accent)' }}>LIVE</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
      <style>{`@keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  )
}
