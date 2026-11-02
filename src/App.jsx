import { useState } from 'react'
import { ApiError } from './api/errors.js'
import { requestPlan } from './api/planLesson.js'
import ApiKeyField from './components/ApiKeyField.jsx'
import PlanView from './components/PlanView.jsx'
import { splitIntoPassages } from './ingest/passages.js'
import { useApiKey } from './state/useApiKey.js'
import { useElapsedSeconds } from './state/useElapsedSeconds.js'

export default function App() {
  const [apiKey, setApiKey] = useApiKey()
  const [teacherPrompt, setTeacherPrompt] = useState('')
  const [sourceText, setSourceText] = useState('')
  const [plan, setPlan] = useState(null)
  const [isPlanning, setIsPlanning] = useState(false)
  const [error, setError] = useState('')
  const planningSeconds = useElapsedSeconds(isPlanning)

  async function createPlan(event) {
    event.preventDefault()
    setPlan(null)
    setError('')
    setIsPlanning(true)
    try {
      setPlan(await requestPlan({ apiKey, teacherPrompt, passages: splitIntoPassages(sourceText) }))
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : 'Could not reach the server. Check your connection and try again.')
    } finally {
      setIsPlanning(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold">Tutorly</h1>
      <ApiKeyField value={apiKey} onChange={setApiKey} />
      <form onSubmit={createPlan} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          What should the lesson be like?
          <textarea
            value={teacherPrompt}
            onChange={(event) => setTeacherPrompt(event.target.value)}
            placeholder="Teach this to 7th graders, in French. Be Socratic. Keep it under 15 minutes."
            rows={3}
            className="rounded-lg border border-slate-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Source text
          <textarea
            value={sourceText}
            onChange={(event) => setSourceText(event.target.value)}
            placeholder="Paste the material to teach (file upload is coming)."
            rows={8}
            className="rounded-lg border border-slate-300 px-3 py-2 font-normal"
          />
        </label>
        <button
          type="submit"
          disabled={isPlanning || !teacherPrompt.trim() || !sourceText.trim()}
          className="self-start rounded-lg bg-indigo-600 px-4 py-2 font-medium tabular-nums text-white disabled:opacity-50"
        >
          {isPlanning ? `Planning… (${planningSeconds}s)` : 'Create lesson plan'}
        </button>
      </form>
      {isPlanning && (
        <p className="text-slate-500" aria-live="polite">
          Reading the source and planning the lesson…
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {plan && <PlanView plan={plan} />}
    </main>
  )
}
