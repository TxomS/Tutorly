import { StarIcon } from './Stars.jsx'

/** "Step 3 of 5" with one segment per step (finished steps are filled, the current one is lighter), and the stars earned so far. */
export default function ProgressBar({ current, total, finished, stars }) {
  const segments = Array.from({ length: total }, (_, position) => position + 1)

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-700">{finished ? 'Lesson complete' : `Step ${current} of ${total}`}</p>
        <p className="flex items-center gap-1 text-sm font-semibold tabular-nums text-amber-600">
          <StarIcon className="h-4 w-4" />
          {/* The number is only for the eyes: a screen reader gets the words. The key makes it bump each time it changes. */}
          <span key={stars} aria-hidden="true" className={`inline-block ${stars > 0 ? 'motion-safe:animate-bump' : ''}`}>
            {stars}
          </span>
          <span className="sr-only">{stars === 1 ? '1 star earned' : `${stars} stars earned`}</span>
        </p>
      </div>
      <div
        role="progressbar"
        aria-label="Lesson progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={finished ? total : current - 1}
        aria-valuetext={finished ? 'Lesson complete' : `Step ${current} of ${total}`}
        className="mt-1 flex gap-1"
      >
        {segments.map((step) => {
          const done = finished || step < current
          const active = !finished && step === current
          return <div key={step} className={`h-1.5 flex-1 rounded-full ${done ? 'bg-indigo-600' : active ? 'bg-indigo-300' : 'bg-slate-200'}`} />
        })}
      </div>
    </div>
  )
}
