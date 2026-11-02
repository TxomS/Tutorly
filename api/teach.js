import { describeGeminiError, streamGemini } from '../server/gemini.js'
import { sendError, startEventStream, writeEvent } from '../server/http.js'
import { TUTOR_SYSTEM_PROMPT } from '../server/prompts.js'

// Give up when Gemini sends nothing for this long, so the student never waits on a stalled call.
const IDLE_TIMEOUT_MS = 30_000

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'method_not_allowed', 'Use POST.')

  const apiKey = req.headers['x-api-key']
  if (!apiKey) return sendError(res, 401, 'missing_key', 'Add your Gemini API key to continue.')

  const messages = req.body?.messages
  if (!Array.isArray(messages) || messages.length === 0) {
    return sendError(res, 400, 'bad_request', 'The request needs at least one message.')
  }

  // Aborting cancels the upstream Gemini call, so we stop paying for text nobody will read.
  const controller = new AbortController()
  let timedOut = false
  let idleTimer
  const restartIdleTimer = () => {
    clearTimeout(idleTimer)
    idleTimer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, IDLE_TIMEOUT_MS)
  }
  res.on('close', () => {
    clearTimeout(idleTimer)
    if (!res.writableFinished) {
      console.log('teach: client left before the reply finished')
      controller.abort()
    }
  })

  startEventStream(res)
  restartIdleTimer()
  try {
    for await (const text of streamGemini({ apiKey, system: TUTOR_SYSTEM_PROMPT, messages, signal: controller.signal })) {
      restartIdleTimer()
      writeEvent(res, { type: 'text', text })
    }
  } catch (error) {
    if (timedOut) {
      writeEvent(res, { type: 'error', code: 'timeout', message: 'Gemini took too long to answer. Try again.' })
    } else if (!controller.signal.aborted) {
      // Only the error type and status are logged: never the key or the request body.
      console.error('teach failed:', error.name, error.status)
      writeEvent(res, { type: 'error', ...describeGeminiError(error) })
    }
  } finally {
    clearTimeout(idleTimer)
  }
  res.end()
}
