'use client'

export default function Toast({ message }: { message: string }) {
  return (
    <div style={{
      position:'fixed', bottom:100, left:'50%',
      transform:'translateX(-50%)',
      background:'linear-gradient(135deg,#1a1a1a,#242424)',
      border:'1px solid var(--border2)', color:'var(--text)',
      fontSize:13, fontWeight:600, padding:'12px 22px',
      borderRadius:14, zIndex:200, whiteSpace:'nowrap',
      boxShadow:'0 8px 30px rgba(0,0,0,0.5)',
      animation:'toastIn 0.25s cubic-bezier(.4,0,.2,1)',
      fontFamily:'var(--sans)',
    }}>
      {message}
    </div>
  )
}
