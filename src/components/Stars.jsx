import { MAX_STARS } from '../lesson/lesson.js'

const STAR_PATH = 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z'

/** One star. `earned` stars are gold; the others are a pale outline. The caller says what the star means to a screen reader. */
export function StarIcon({ earned = true, className = '', style }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      strokeWidth="1"
      strokeLinejoin="round"
      className={`${earned ? 'fill-amber-400 stroke-amber-500' : 'fill-slate-200 stroke-slate-300'} ${className}`}
      style={style}
    >
      <path d={STAR_PATH} />
    </svg>
  )
}

/** A row of stars, `count` of them earned. With `animate`, the earned ones pop in one after another. */
export default function Stars({ count, max = MAX_STARS, size = 'h-5 w-5', animate = false }) {
  return (
    <span role="img" aria-label={`${count} of ${max} stars`} className="inline-flex gap-0.5">
      {Array.from({ length: max }, (_, index) => {
        const earned = index < count
        const pops = earned && animate
        return <StarIcon key={index} earned={earned} className={`${size} ${pops ? 'motion-safe:animate-star-pop' : ''}`} style={pops ? { animationDelay: `${index * 160}ms` } : undefined} />
      })}
    </span>
  )
}
