import { ApiError, GoogleGenAI } from '@google/genai'

// Picked by timing candidates on a free key: this alias started replying in under a second,
// while `gemini-flash-latest` took minutes. Override it with GEMINI_MODEL.
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-flash-lite-latest'

/** Streams the model's reply as text chunks. Message roles are "user" and "assistant". */
export async function* streamGemini({ apiKey, system, messages, signal }) {
  const ai = new GoogleGenAI({ apiKey })
  const stream = await ai.models.generateContentStream({
    model: MODEL,
    contents: messages.map(({ role, content }) => ({
      role: role === 'assistant' ? 'model' : 'user',
      parts: [{ text: content }],
    })),
    config: { systemInstruction: system, abortSignal: signal },
  })

  for await (const chunk of stream) {
    if (chunk.text) yield chunk.text
  }
}

/** Turns a provider failure into a code the UI can act on and a message that is safe to show. */
export function describeGeminiError(error) {
  const status = error instanceof ApiError ? error.status : undefined

  if (status === 401 || status === 403 || /api key not valid|api_key_invalid/i.test(error.message)) {
    return { code: 'invalid_key', message: 'Gemini rejected this API key. Check that you pasted it correctly.' }
  }
  if (status === 429) {
    return { code: 'rate_limited', message: 'Gemini is rate limiting this key. Wait a minute and try again.' }
  }
  if (status === 404) {
    return { code: 'model_unavailable', message: `The model "${MODEL}" is not available for this key.` }
  }
  if (status >= 500) {
    return { code: 'provider_unavailable', message: 'Gemini is busy or temporarily unavailable. Try again in a moment.' }
  }
  return { code: 'provider_error', message: 'Gemini could not complete the request.' }
}
