import PlanView from './PlanView.jsx'

/** The plan, shown to the teacher before the lesson starts. */
export default function PlanPreview({ plan, onStart, onEdit }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 p-4">
      <header>
        <h1 className="text-2xl font-semibold">Tutorly</h1>
        <p className="mt-1 text-slate-600">Here is the lesson plan. Read it, then start the lesson to try it as the student.</p>
      </header>
      <div className="flex gap-2">
        <button type="button" onClick={onStart} className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white">
          Start lesson
        </button>
        <button type="button" onClick={onEdit} className="rounded-lg border border-slate-300 px-4 py-2 font-medium">
          Edit request
        </button>
      </div>
      <PlanView plan={plan} />
    </main>
  )
}
