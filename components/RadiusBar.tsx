'use client'

import { RADIUS_OPTIONS } from '@/lib/geo'

type Props = { selected: number; onChange: (km: number) => void }

export default function RadiusBar({ selected, onChange }: Props) {
  return (
    <div style={{ padding:'0 16px 20px', flexShrink:0, paddingBottom:'max(20px, env(safe-area-inset-bottom, 20px))' }}>
      <p style={{ fontSize:12, fontWeight:600, color:'var(--text-dim)', marginBottom:8 }}>Rekkevidde</p>
      <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:2, scrollbarWidth:'none' }}>
        {RADIUS_OPTIONS.map(km => (
          <button
            key={km}
            onClick={() => onChange(km)}
            style={{
              fontFamily:'var(--sans)', fontSize:13, fontWeight:600,
              padding:'8px 14px',
              border:`1.5px solid ${selected === km ? 'white' : 'var(--border2)'}`,
              background: selected === km ? 'white' : 'var(--surface)',
              color: selected === km ? '#0e0e0e' : 'var(--text-dim)',
              borderRadius:20, cursor:'pointer', transition:'all 0.15s',
              whiteSpace:'nowrap', flexShrink:0,
            }}
          >
            {km} km
          </button>
        ))}
      </div>
    </div>
  )
}
