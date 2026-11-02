import { describeGeminiError } from './gemini.js'
import { HttpError, sendError } from './http.js'

/**
 * The shared shell of the endpoints that answer with one JSON object: method and key checks, a timeout,
 * cancelling the Gemini call when the client leaves, and turning every failure into a clear error response.
 * `run({ apiKey, body, signal })` does the actual work and returns the object to send.
 */
export async function handleJsonRequest(req, res, { name, timeoutMs, run }) {
  if (req.method !== 'POST') return sendError(res, 405, 'method_not_allowed', 'Use POST.')

  const apiKey = req.headers['x-api-key']
  if (!apiKey) return sendError(res, 401, 'missing_key', 'Add your Gemini API key to continue.')

  const clientGone = new AbortController()
  res.on('close', () => {
    if (!res.writableFinished) clientGone.abort()
  })
  const signal = AbortSignal.any([clientGone.signal, AbortSignal.timeout(timeoutMs)])

  try {
    res.status(200).json(await run({ apiKey, body: req.body, signal }))
  } catch (error) {
    if (clientGone.signal.aborted) return
    if (error instanceof HttpError) return sendError(res, error.status, error.code, error.message)
    if (signal.aborted) return sendError(res, 504, 'timeout', 'Gemini took too long to answer. Try again.')

    // Only the error type and status are logged: never the key or the request body.
    console.error(`${name} failed:`, error.name, error.status)
    const { status, code, message } = describeGeminiError(error)
    sendError(res, status, code, message)
  }
}
