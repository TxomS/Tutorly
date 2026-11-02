import { describeGeminiError, streamGemini } from '../server/gemini.js'
import { HttpError, sendError, startEventStream, writeEvent } from '../server/http.js'
import { tutorSystemPrompt } from '../server/prompts.js'
import { parseTeachRequest } from '../server/tutor.js'

// Give up when Gemini sends nothing for this long, so the student never waits on a stalled call.
const IDLE_TIMEOUT_MS = 30_000

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'method_not_allowed', 'Use POST.')

  const apiKey = req.headers['x-api-key']
  if (!apiKey) return sendError(res, 401, 'missing_key', 'Add your Gemini API key to continue.')

  let request
  try {
    request = parseTeachRequest(req.body)
  } catch (error) {
    if (error instanceof HttpError) return sendError(res, error.status, error.code, error.message)
    throw error
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
    const stream = streamGemini({ apiKey, system: tutorSystemPrompt(request), messages: request.messages, signal: controller.signal })
    for await (const text of stream) {
      restartIdleTimer()
      writeEvent(res, { type: 'text', text })
    }
  } catch (error) {
    if (timedOut) {
      writeEvent(res, { type: 'error', code: 'timeout', message: 'Gemini took too long to answer. Try again.' })
    } else if (!controller.signal.aborted) {
      // Only the error type and status are logged: never the key or the request body.
      console.error('teach failed:', error.name, error.status)
      const { code, message } = describeGeminiError(error)
      writeEvent(res, { type: 'error', code, message })
    }
  } finally {
    clearTimeout(idleTimer)
  }
  res.end()
}
