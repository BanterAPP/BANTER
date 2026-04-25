'use client'

import { useRef } from 'react'

type PTTState = 'idle' | 'speaking' | 'cooldown' | 'blocked' | 'banned'

type Props = {
  state: PTTState
  hintText: string
  onPressStart: () => void
  onPressEnd: () => void
}

const ICONS: Record<PTTState, string> = {
  idle:     '🎙️',
  speaking: '🔴',
  cooldown: '⏳',
  blocked:  '🚫',
  banned:   '🔒',
}

const LABELS: Record<PTTState, string> = {
  idle:     'Hold',
  speaking: 'Sender',
  cooldown: 'Vent',
  blocked:  'Opptatt',
  banned:   'Utestengt',
}

export default function PTTButton({ state, hintText, onPressStart, onPressEnd }: Props) {
  const pressing = useRef(false)

  const start = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    if (pressing.current) return
    pressing.current = true
    onPressStart()
  }

  const end = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    if (!pressing.current) return
    pressing.current = false
    onPressEnd()
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'10px 24px 10px', gap:10, flexShrink:0 }}>
      <div
        className={`ptt-btn ${state}`}
        onMouseDown={start} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchEnd={end}
        onContextMenu={e => e.preventDefault()}
      >
        <div className="ptt-ring1" />
        <div className="ptt-ring2" />
        <span style={{ fontSize:26 }}>{ICONS[state]}</span>
        <span style={{ fontSize:11, fontWeight:700, color:'white', letterSpacing:'1.5px', textTransform:'uppercase', opacity: state === 'blocked' || state === 'banned' ? 0.4 : 0.9 }}>
          {LABELS[state]}
        </span>
      </div>
      <p style={{ fontSize:13, fontWeight:500, color:'var(--text-dim)', textAlign:'center', minHeight:18 }}>
        {hintText}
      </p>
    </div>
  )
}
