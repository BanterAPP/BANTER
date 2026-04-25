'use client'

type Props = {
  nick: string
  radius: number
  hasLocation: boolean
  locationError: boolean
}

export default function TopBar({ nick, radius, hasLocation, locationError }: Props) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px 12px', flexShrink:0, paddingTop:'max(14px, env(safe-area-inset-top, 14px))' }}>
      <div style={{ fontSize:22, fontWeight:800, letterSpacing:'-1px' }}>
        <span style={{ background:'var(--grad-main)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
          Banter
        </span>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:6, background:'var(--surface)', borderRadius:20, padding:'6px 12px', border:'1px solid var(--border2)' }}>
        <div style={{
          width:7, height:7, borderRadius:'50%',
          background: locationError ? '#ff4e50' : hasLocation ? 'var(--green)' : '#f7971e',
          boxShadow: locationError ? 'none' : hasLocation ? '0 0 6px var(--green)' : '0 0 6px #f7971e',
          animation: hasLocation && !locationError ? 'pulse-dot 2s ease-in-out infinite' : undefined,
        }} />
        <span style={{ fontSize:12, fontWeight:600, color:'var(--text-mid)' }}>
          {locationError ? 'Ingen GPS' : hasLocation ? `LIVE · ${radius}km` : 'GPS...'}
        </span>
      </div>

      <div style={{ fontSize:13, fontWeight:600, color:'var(--text-mid)', background:'var(--surface)', padding:'6px 14px', borderRadius:20, border:'1px solid var(--border2)', maxWidth:90, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {nick}
      </div>

      <style>{`@keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  )
}
