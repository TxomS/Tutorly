import { ApiError, assertOk } from './errors.js'

/**
 * POSTs `body` to `url` and calls `onEvent` for each event in the newline-delimited JSON reply.
 * Rejects with an ApiError for server failures and with an AbortError when `signal` aborts.
 */
export async function postEvents(url, { apiKey, body, signal, onEvent }) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify(body),
    signal,
  })

  await assertOk(response)

  const handleLine = (line) => {
    if (!line) return
    const event = JSON.parse(line)
    if (event.type === 'error') throw new ApiError(event.code, event.message)
    onEvent(event)
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += value
    const lines = buffer.split('\n')
    buffer = lines.pop()
    lines.forEach(handleLine)
  }
  handleLine(buffer)
}
