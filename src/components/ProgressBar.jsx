/** "Step 3 of 5" with one segment per step: finished steps are filled, the current one is lighter. */
export default function ProgressBar({ current, total, finished }) {
  const segments = Array.from({ length: total }, (_, position) => position + 1)

  return (
    <div>
      <p className="text-sm font-medium text-slate-700">{finished ? 'Lesson complete' : `Step ${current} of ${total}`}</p>
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
