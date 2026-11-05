import { Fragment } from 'react'
import { StarIcon } from './Stars.jsx'

// The match-up marker: pale while the game is still ahead, pulsing while it is on, solid once it has been played.
const GAME_MARKER = {
  upcoming: 'bg-amber-300',
  waiting: 'bg-amber-500 motion-safe:animate-pulse',
  done: 'bg-amber-500',
}

/**
 * "Step 3 of 5" with one segment per step (finished steps are filled, the current one is lighter), and the stars earned so far.
 * While the lesson is paused for the match-up game, the current step is already finished, so it is filled too.
 * If the lesson has a match-up game, a short amber bar (half as wide as a step) sits where it comes, so the student can see it ahead of time.
 */
export default function ProgressBar({ current, total, finished, reviewing, review, stars }) {
  const segments = Array.from({ length: total }, (_, position) => position + 1)
  const label = finished ? 'Lesson complete' : reviewing ? `Step ${current} of ${total} done · match-up` : `Step ${current} of ${total}`
  // The coloured bars carry no words, so a screen reader is told about the game here.
  const valueText = review?.phase === 'upcoming' ? `${label}. A match-up game comes after step ${review.after}.` : label

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-700">{label}</p>
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
        aria-valuenow={finished ? total : reviewing ? current : current - 1}
        aria-valuetext={valueText}
        className="mt-1 flex gap-1"
      >
        {segments.map((step) => {
          const done = finished || step < current || (reviewing && step === current)
          const active = !finished && !reviewing && step === current
          return (
            <Fragment key={step}>
              <div className={`h-1.5 flex-1 rounded-full ${done ? 'bg-indigo-600' : active ? 'bg-indigo-300' : 'bg-slate-200'}`} />
              {review && step === review.after && <div title="Match-up game" className={`h-1.5 flex-[0.5] rounded-full ${GAME_MARKER[review.phase]}`} />}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
