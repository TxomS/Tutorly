import Confetti from './Confetti.jsx'
import Stars, { StarIcon } from './Stars.jsx'

const encouragement = ({ earned, possible }) => (earned === possible ? 'A perfect run!' : earned >= possible * 0.6 ? 'Great work!' : 'Well done for sticking with it!')

/**
 * Shown when the last step is done: the stars, step by step, and a way out. A step the tutor had to explain
 * says "Worth another look" instead of showing empty stars.
 */
export default function FinishedCard({ steps, outcomes, stars, onLeave }) {
  return (
    <div className="border-t border-slate-200 bg-white px-4 py-4 text-center">
      <div className="relative flex justify-center">
        <StarIcon className="h-11 w-11 motion-safe:animate-star-pop" />
        <Confetti />
      </div>
      <p className="mt-1 text-lg font-semibold">Lesson complete!</p>
      <p className="text-sm text-slate-600">
        {stars.earned} of {stars.possible} stars. {encouragement(stars)}
      </p>
      <ul className="mx-auto mt-3 max-h-[26dvh] max-w-sm divide-y divide-slate-100 overflow-y-auto text-start text-sm">
        {outcomes.map(({ result, stars: earned }, index) => (
          <li key={steps[index].id} className="flex items-center justify-between gap-3 py-1.5">
            <span className="flex min-w-0 gap-2">
              <span className="tabular-nums text-slate-400">{index + 1}</span>
              <span dir="auto" className="truncate">
                {steps[index].title}
              </span>
            </span>
            {result === 'correct' ? <Stars count={earned} size="h-4 w-4" /> : <span className="shrink-0 text-xs text-slate-500">Worth another look</span>}
          </li>
        ))}
      </ul>
      <button type="button" onClick={onLeave} className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white">
        Back to the plan
      </button>
    </div>
  )
}
