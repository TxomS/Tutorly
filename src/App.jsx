import { useRef, useState } from 'react'
import { ApiError, postEvents } from './api/streamEvents.js'
import ApiKeyField from './components/ApiKeyField.jsx'
import Markdown from './components/Markdown.jsx'
import { useApiKey } from './state/useApiKey.js'

export default function App() {
  const [apiKey, setApiKey] = useApiKey()
  const [question, setQuestion] = useState('')
  const [reply, setReply] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const controllerRef = useRef(null)

  async function ask(event) {
    event.preventDefault()
    const controller = new AbortController()
    controllerRef.current = controller
    setReply('')
    setError('')
    setStatus('streaming')
    try {
      await postEvents('/api/teach', {
        apiKey,
        body: { messages: [{ role: 'user', content: question }] },
        signal: controller.signal,
        onEvent: (streamEvent) => {
          if (streamEvent.type === 'text') setReply((previous) => previous + streamEvent.text)
        },
      })
      setStatus('done')
    } catch (failure) {
      if (failure.name === 'AbortError') {
        setStatus('stopped')
        return
      }
      setError(failure instanceof ApiError ? failure.message : 'Could not reach the server. Check your connection and try again.')
      setStatus('error')
    }
  }

  const isStreaming = status === 'streaming'

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold">Tutorly</h1>
      <ApiKeyField value={apiKey} onChange={setApiKey} />
      <form onSubmit={ask} className="flex flex-col gap-3">
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask the tutor anything"
          rows={3}
          className="rounded-lg border border-slate-300 px-3 py-2"
        />
        <button
          type={isStreaming ? 'button' : 'submit'}
          onClick={isStreaming ? () => controllerRef.current?.abort() : undefined}
          disabled={!isStreaming && !question.trim()}
          className="self-start rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {isStreaming ? 'Stop' : 'Ask'}
        </button>
      </form>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {(reply || isStreaming) && (
        <div className="rounded-lg border border-slate-200 p-4" aria-live="polite">
          {reply ? <Markdown>{reply}</Markdown> : <p className="text-slate-500">Thinking…</p>}
        </div>
      )}
    </main>
  )
}
