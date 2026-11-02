import { assertOk } from './errors.js'

/** POSTs `body` as JSON with the user's key and returns the JSON reply. Rejects with an ApiError for server failures and an AbortError when `signal` aborts. */
export async function postJson(url, { apiKey, body, signal }) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify(body),
    signal,
  })
  await assertOk(response)
  return response.json()
}
