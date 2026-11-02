import { useRef, useState } from 'react'
import { streamText } from './api/streamText.js'

const STATUS_LABEL = {
  idle: 'Ready',
  streaming: 'Streaming…',
  done: 'Done',
  stopped: 'Stopped',
  error: 'Something went wrong',
}

export default function App() {
  const [text, setText] = useState('')
  const [status, setStatus] = useState('idle')
  const controllerRef = useRef(null)

  async function start() {
    const controller = new AbortController()
    controllerRef.current = controller
    setText('')
    setStatus('streaming')
    try {
      await streamText('/api/hello', {
        signal: controller.signal,
        onChunk: (chunk) => setText((previous) => previous + chunk),
      })
      setStatus('done')
    } catch (error) {
      setStatus(error.name === 'AbortError' ? 'stopped' : 'error')
    }
  }

  function stop() {
    controllerRef.current?.abort()
  }

  const isStreaming = status === 'streaming'

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold">Tutorly</h1>
      <p className="min-h-24 rounded-lg border border-slate-200 p-4" aria-live="polite">
        {text || 'Press Start to stream a message from the server.'}
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={isStreaming ? stop : start}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white"
        >
          {isStreaming ? 'Stop' : 'Start'}
        </button>
        <span className="text-sm text-slate-500">{STATUS_LABEL[status]}</span>
      </div>
    </main>
  )
}
