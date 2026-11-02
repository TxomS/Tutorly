/** Shown when the last step is done: how the student did, and a way out. */
export default function FinishedCard({ outcomes, onLeave }) {
  const worked = outcomes.filter((outcome) => outcome === 'correct').length
  const explained = outcomes.length - worked

  return (
    <div className="border-t border-slate-200 bg-white px-4 py-4 text-center">
      <p className="font-semibold">Lesson complete</p>
      <p className="mt-1 text-sm text-slate-600">
        {worked} of {outcomes.length} steps worked out by the student
        {explained > 0 ? `, ${explained} explained by the tutor` : ''}.
      </p>
      <button type="button" onClick={onLeave} className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white">
        Back to the plan
      </button>
    </div>
  )
}
