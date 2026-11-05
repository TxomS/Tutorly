import { MAX_STARS } from '../lesson/lesson.js'
import Confetti from './Confetti.jsx'
import Stars from './Stars.jsx'

const PRAISE = { 3: 'First try!', 2: 'Well done!', 1: 'You got there!' }

/**
 * A reward when a step is finished: the stars pop in over the top of the chat, the notice stays for about 7 seconds, and then it fades away by itself.
 * Taps and scrolling go through it, so it never blocks the chat.
 * A step the tutor had to explain gets no pop-up, only a note for screen readers, so that moving on is not made to feel like failing.
 * It must be placed inside a `relative` parent. It is centred across that parent; `className` can narrow it (for example to centre it over one half of a split screen).
 */
export default function StepCelebration({ outcomes, className = '' }) {
  const latest = outcomes.at(-1)
  const step = outcomes.length
  const announcement = !latest ? '' : latest.stars > 0 ? `Step ${step} complete. ${latest.stars} of ${MAX_STARS} stars.` : `Step ${step} explained by the tutor.`

  return (
    <>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {latest?.stars > 0 && (
        // The key restarts the animation for each finished step.
        <div key={step} aria-hidden="true" className={`pointer-events-none absolute start-0 end-0 top-4 z-10 flex justify-center ${className}`}>
          <div className="relative flex flex-col items-center gap-2 rounded-3xl border border-amber-200 bg-white px-8 py-5 shadow-xl motion-safe:animate-celebrate motion-reduce:animate-celebrate-fade sm:px-12 sm:py-6">
            <p className="text-lg font-semibold text-slate-800 sm:text-2xl">Step {step} complete</p>
            <Stars count={latest.stars} size="h-10 w-10 sm:h-14 sm:w-14" animate />
            <p className="text-base text-slate-500 sm:text-lg">{PRAISE[latest.stars] ?? 'Well done!'}</p>
            {latest.stars === MAX_STARS && <Confetti spread={1.6} />}
          </div>
        </div>
      )}
    </>
  )
}
