const COLORS = ['bg-amber-400', 'bg-indigo-500', 'bg-emerald-400', 'bg-rose-400', 'bg-sky-400']

// Fixed, not random, so that the same celebration looks the same every time and rendering stays predictable.
const PIECES = Array.from({ length: 14 }, (_, index) => {
  const angle = (index / 14) * 2 * Math.PI
  const reach = index % 2 === 0 ? 90 : 60
  return {
    x: Math.round(Math.cos(angle) * reach),
    y: Math.round(Math.sin(angle) * reach) - 10,
    spin: (index % 3) * 120 + 90,
    color: COLORS[index % COLORS.length],
  }
})

/**
 * A short burst of coloured pieces from the middle of its parent, which must be `relative`. `spread` makes the burst wider for a bigger parent.
 * Not shown at all when the person prefers less motion.
 */
export default function Confetti({ spread = 1 }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 motion-reduce:hidden">
      {PIECES.map(({ x, y, spin, color }, index) => (
        <span
          key={index}
          className={`absolute h-2 w-2 rounded-sm motion-safe:animate-confetti ${color}`}
          style={{ '--x': `${Math.round(x * spread)}px`, '--y': `${Math.round(y * spread)}px`, '--r': `${spin}deg`, animationDelay: '250ms' }}
        />
      ))}
    </span>
  )
}
