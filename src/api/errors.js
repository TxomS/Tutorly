/** An error reported by our server; `code` says what went wrong (for example "invalid_key"). */
export class ApiError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

/** Throws an ApiError from our server's `{ error: { code, message } }` body when the response is not OK. */
export async function assertOk(response) {
  if (response.ok) return
  const { error } = await response.json().catch(() => ({}))
  throw new ApiError(error?.code ?? 'request_failed', error?.message ?? `Request failed (${response.status})`)
}
