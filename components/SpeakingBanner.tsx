'use client'

type Props = {
  iAmSpeaking: boolean
  otherSpeaking: boolean
  speakingNick: string | null
}

const Wave = ({ color }: { color: string }) => (
  <div className="waveform">
    {[0,1,2,3,4].map(i => <span key={i} style={{ background: color }} />)}
  </div>
)

export default function SpeakingBanner({ iAmSpeaking, otherSpeaking, speakingNick }: Props) {
  const style: React.CSSProperties = {
    margin: '0 16px 10px',
    borderRadius: 14,
    height: 48,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    flexShrink: 0,
    border: '1px solid',
    overflow: 'hidden',
    transition: 'all 0.3s cubic-bezier(.4,0,.2,1)',
    borderColor: iAmSpeaking ? 'rgba(67,233,123,0.3)' : otherSpeaking ? 'rgba(255,78,80,0.3)' : 'var(--border)',
    background: iAmSpeaking ? 'rgba(67,233,123,0.1)' : otherSpeaking ? 'rgba(255,78,80,0.1)' : 'var(--surface)',
  }

  return (
    <div style={style}>
      {iAmSpeaking && (
        <>
          <Wave color="#43e97b" />
          <span style={{ fontSize:13, fontWeight:600, color:'var(--green)' }}>Du snakker</span>
          <Wave color="#43e97b" />
        </>
      )}
      {otherSpeaking && (
        <>
          <Wave color="#ff4e50" />
          <span style={{ fontSize:13, fontWeight:600, color:'var(--accent)' }}>
            {speakingNick || 'Noen'} snakker...
          </span>
          <Wave color="#ff4e50" />
        </>
      )}
      {!iAmSpeaking && !otherSpeaking && (
        <span style={{ fontSize:13, fontWeight:500, color:'var(--text-dim)' }}>🎙️ Kanal ledig</span>
      )}
    </div>
  )
}
