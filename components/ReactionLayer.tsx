'use client'

type FloatingEmoji = { id: string; emoji: string; x: number }

export default function ReactionLayer({ reactions }: { reactions: FloatingEmoji[] }) {
  if (reactions.length === 0) return null
  return (
    <div style={{ position:'absolute', bottom:260, left:0, right:0, height:340, pointerEvents:'none', zIndex:50, overflow:'hidden' }}>
      {reactions.map(r => (
        <div
          key={r.id}
          className="floating-emoji"
          style={{ left: r.x }}
        >
          {r.emoji}
        </div>
      ))}
    </div>
  )
}
