import { describeGeminiError } from '../server/gemini.js'
import { HttpError, sendError } from '../server/http.js'
import { createPlan, parsePlanRequest } from '../server/planner.js'

// Planning reads the whole source before answering, so it gets longer than a chat reply.
const PLAN_TIMEOUT_MS = 60_000

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'method_not_allowed', 'Use POST.')

  const apiKey = req.headers['x-api-key']
  if (!apiKey) return sendError(res, 401, 'missing_key', 'Add your Gemini API key to continue.')

  // Stop the Gemini call when the client leaves or when it takes too long.
  const clientGone = new AbortController()
  res.on('close', () => {
    if (!res.writableFinished) clientGone.abort()
  })
  const signal = AbortSignal.any([clientGone.signal, AbortSignal.timeout(PLAN_TIMEOUT_MS)])

  try {
    const { teacherPrompt, passages } = parsePlanRequest(req.body)
    const plan = await createPlan({ apiKey, teacherPrompt, passages, signal })
    res.status(200).json({ plan })
  } catch (error) {
    if (clientGone.signal.aborted) return
    if (error instanceof HttpError) return sendError(res, error.status, error.code, error.message)
    if (signal.aborted) return sendError(res, 504, 'timeout', 'Gemini took too long to answer. Try again.')

    // Only the error type and status are logged: never the key or the request body.
    console.error('plan failed:', error.name, error.status)
    const { status, code, message } = describeGeminiError(error)
    sendError(res, status, code, message)
  }
}
