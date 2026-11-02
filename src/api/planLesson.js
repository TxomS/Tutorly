import { assertOk } from './errors.js'

/** Asks the server for a lesson plan. Rejects with an ApiError for server failures and an AbortError when `signal` aborts. */
export async function requestPlan({ apiKey, teacherPrompt, passages, signal }) {
  const response = await fetch('/api/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ teacherPrompt, passages }),
    signal,
  })
  await assertOk(response)
  const { plan } = await response.json()
  return plan
}
