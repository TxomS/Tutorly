/** An error reported by our server; `code` says what went wrong (for example "invalid_key"). */
export class ApiError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

/** What to tell the user when a request failed: our server's own message, or a generic one when the server could not be reached. */
export const describeFailure = (error) =>
  error instanceof ApiError ? error.message : 'Could not reach the server. Check your connection and try again.'

/** Throws an ApiError from our server's `{ error: { code, message } }` body when the response is not OK. */
export async function assertOk(response) {
  if (response.ok) return
  const { error } = await response.json().catch(() => ({}))
  throw new ApiError(error?.code ?? 'request_failed', error?.message ?? `Request failed (${response.status})`)
}
