'use client'

import { ReactionEmoji } from '@/lib/types'

type Props = {
  onReact: (emoji: ReactionEmoji) => void
  thumbsCount: number
  threshold: number
}

const EMOJIS: { emoji: ReactionEmoji; label: string }[] = [
  { emoji: '😂', label: 'Latter' },
  { emoji: '🔥', label: 'Flamme' },
  { emoji: '❤️', label: 'Hjerte' },
  { emoji: '👎', label: 'Thumbs' },
]

export default function ReactionBar({ onReact, thumbsCount, threshold }: Props) {
  const handleClick = (emoji: ReactionEmoji) => {
    onReact(emoji)
    if (emoji === '👎') {
      const el = document.getElementById('react-thumbs')
      if (el) {
        el.style.animation = 'none'
        void el.offsetHeight
        el.style.animation = 'shake 0.4s ease'
      }
    }
  }

  const thumbsPct = Math.min((thumbsCount / threshold) * 100, 100)

  return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:12, padding:'8px 20px 4px', flexShrink:0 }}>
      {EMOJIS.map(({ emoji, label }) => {
        const isThumbs = emoji === '👎'
        return (
          <button
            key={emoji}
            id={isThumbs ? 'react-thumbs' : undefined}
            onClick={() => handleClick(emoji)}
            title={label}
            style={{
              position:'relative',
              width:60, height:60, borderRadius:'50%',
              background:'var(--surface)',
              border:`1.5px solid ${isThumbs ? 'rgba(255,78,80,0.3)' : 'var(--border2)'}`,
              fontSize:24, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              flexDirection:'column', gap:2,
              transition:'transform 0.15s',
              WebkitUserSelect:'none', userSelect:'none',
              flexShrink:0,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.background = isThumbs ? 'rgba(255,78,80,0.1)' : 'var(--surface2)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'var(--surface)' }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.85)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1.1)'}
          >
            {isThumbs && thumbsPct > 0 && (
              <svg style={{ position:'absolute', inset:-3, width:'calc(100% + 6px)', height:'calc(100% + 6px)', transform:'rotate(-90deg)', pointerEvents:'none' }}
                viewBox="0 0 66 66">
                <circle cx="33" cy="33" r="30" fill="none" stroke="rgba(255,78,80,0.15)" strokeWidth="3"/>
                <circle cx="33" cy="33" r="30" fill="none" stroke="#ff4e50" strokeWidth="3"
                  strokeDasharray={`${thumbsPct * 1.885} 188.5`}
                  strokeLinecap="round" style={{ transition:'stroke-dasharray 0.3s ease' }}/>
              </svg>
            )}
            <span>{emoji}</span>
            {isThumbs && (
              <span style={{ fontSize:9, fontWeight:700, color:'#ff6b6b', lineHeight:1 }}>
                {thumbsCount}/{threshold}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
