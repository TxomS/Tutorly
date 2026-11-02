/** Fetches `url` and feeds each decoded text chunk to `onChunk`. Aborting `signal` rejects with an AbortError. */
export async function streamText(url, { signal, onChunk }) {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`Request failed (${response.status})`)

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) return
    onChunk(value)
  }
}
