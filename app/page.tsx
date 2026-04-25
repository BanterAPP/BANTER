'use client'

import { useState } from 'react'
import BanterApp from '@/components/BanterApp'

export default function Home() {
  const [nick, setNick] = useState('')
  const [input, setInput] = useState('')
  const [shake, setShake] = useState(false)

  const enter = () => {
    const clean = input.trim().replace(/\s+/g, '_').slice(0, 16)
    if (!clean) { setShake(true); setTimeout(() => setShake(false), 500); return }
    setNick(clean)
  }

  if (nick) return <BanterApp nick={nick} />

  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px',
      background: 'var(--bg)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position:'absolute', top:'-80px', left:'-60px', width:'300px', height:'300px', background:'radial-gradient(circle, rgba(247,151,30,0.18) 0%, transparent 70%)', borderRadius:'50%', animation:'blob1 6s ease-in-out infinite', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'-60px', right:'-80px', width:'280px', height:'280px', background:'radial-gradient(circle, rgba(255,78,80,0.15) 0%, transparent 70%)', borderRadius:'50%', animation:'blob2 7s ease-in-out infinite', pointerEvents:'none' }} />

      <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:'360px', display:'flex', flexDirection:'column', alignItems:'center', gap:0 }}>
        <div style={{ width:80, height:80, background:'var(--grad-main)', borderRadius:24, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24, boxShadow:'0 12px 40px rgba(255,78,80,0.4)' }}>
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <rect x="14" y="7" width="16" height="22" rx="8" fill="white" opacity="0.95"/>
            <path d="M8 26 C8 35 36 35 36 26" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.95"/>
            <line x1="22" y1="37" x2="22" y2="42" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.95"/>
            <line x1="15" y1="42" x2="29" y2="42" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.95"/>
          </svg>
        </div>

        <h1 style={{ fontSize:36, fontWeight:800, letterSpacing:'-1.5px', marginBottom:8, background:'var(--grad-main)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
          Banter
        </h1>
        <p style={{ fontSize:14, color:'var(--text-dim)', marginBottom:48 }}>
          Snakk med folk i nærheten 🎙️
        </p>

        <div style={{ width:'100%', background:'var(--surface)', borderRadius:16, border:`1.5px solid var(--border2)`, padding:'16px 20px', display:'flex', flexDirection:'column', gap:6, marginBottom:16, transition:'border-color 0.2s', animation: shake ? 'shake 0.4s ease' : undefined }}>
          <label style={{ fontSize:11, fontWeight:600, color:'var(--text-dim)', letterSpacing:'0.5px', textTransform:'uppercase' }}>Ditt kallenavn</label>
          <input
            style={{ background:'transparent', border:'none', outline:'none', fontSize:20, fontWeight:600, color:'var(--text)', letterSpacing:'-0.5px', width:'100%', fontFamily:'var(--sans)' }}
            placeholder="f.eks. surferdude"
            value={input}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            maxLength={16}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && enter()}
            onFocus={e => (e.target.parentElement!.style.borderColor = 'rgba(247,151,30,0.5)')}
            onBlur={e => (e.target.parentElement!.style.borderColor = 'var(--border2)')}
          />
        </div>

        <button
          onClick={enter}
          style={{ width:'100%', padding:18, background:'var(--grad-main)', border:'none', borderRadius:16, color:'white', fontSize:16, fontWeight:700, cursor:'pointer', letterSpacing:'-0.3px', boxShadow:'0 8px 30px rgba(255,78,80,0.35)', fontFamily:'var(--sans)', transition:'transform 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.01)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.98)')}
          onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          Gå inn →
        </button>

        <p style={{ marginTop:20, fontSize:12, color:'var(--text-dim)', display:'flex', alignItems:'center', gap:6 }}>
          <span>🔒</span><span>Anonymt · Ingen lagring · Kun live</span>
        </p>
      </div>

      <style>{`
        @keyframes blob1 { 0%,100%{transform:scale(1) translate(0,0)} 50%{transform:scale(1.15) translate(20px,20px)} }
        @keyframes blob2 { 0%,100%{transform:scale(1) translate(0,0)} 50%{transform:scale(1.1) translate(-15px,-20px)} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
      `}</style>
    </div>
  )
}
