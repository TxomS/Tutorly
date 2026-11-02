import { useState } from 'react'
import { describeFailure } from '../api/errors.js'
import { requestPlan } from '../api/planLesson.js'
import { splitIntoPassages } from '../ingest/passages.js'
import { useElapsedSeconds } from '../state/useElapsedSeconds.js'
import ApiKeyField from './ApiKeyField.jsx'

/** The first screen: the key, what the lesson should be like, and the material to teach. */
export default function SetupScreen({ apiKey, onApiKeyChange, teacherPrompt, onTeacherPromptChange, sourceText, onSourceTextChange, onPlanned }) {
  const [isPlanning, setIsPlanning] = useState(false)
  const [error, setError] = useState('')
  const planningSeconds = useElapsedSeconds(isPlanning)
  const hasKey = apiKey.trim() !== ''

  async function createPlan(event) {
    event.preventDefault()
    setError('')
    setIsPlanning(true)
    try {
      const passages = splitIntoPassages(sourceText)
      onPlanned({ plan: await requestPlan({ apiKey, teacherPrompt, passages }), passages })
    } catch (failure) {
      setError(describeFailure(failure))
    } finally {
      setIsPlanning(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 p-4">
      <header>
        <h1 className="text-2xl font-semibold">Tutorly</h1>
        <p className="mt-1 text-slate-600">Paste what you want to teach and describe the lesson. Tutorly plans it, then teaches it to a student one step at a time.</p>
      </header>
      <ApiKeyField value={apiKey} onChange={onApiKeyChange} />
      <form onSubmit={createPlan} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          What should the lesson be like?
          <textarea
            value={teacherPrompt}
            onChange={(event) => onTeacherPromptChange(event.target.value)}
            placeholder="Teach this to 7th graders, in French. Be Socratic. Keep it under 15 minutes."
            rows={3}
            dir="auto"
            className="rounded-lg border border-slate-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Source text
          <textarea
            value={sourceText}
            onChange={(event) => onSourceTextChange(event.target.value)}
            placeholder="Paste the material to teach (file upload is coming)."
            rows={8}
            dir="auto"
            className="rounded-lg border border-slate-300 px-3 py-2 font-normal"
          />
        </label>
        <button
          type="submit"
          disabled={isPlanning || !hasKey || !teacherPrompt.trim() || !sourceText.trim()}
          className="self-start rounded-lg bg-indigo-600 px-4 py-2 font-medium tabular-nums text-white disabled:opacity-50"
        >
          {isPlanning ? `Planning… (${planningSeconds}s)` : 'Create lesson plan'}
        </button>
        {!hasKey && <p className="text-sm text-slate-500">Add your Gemini API key above to start.</p>}
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
    </main>
  )
}
