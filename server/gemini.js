import { ApiError, GoogleGenAI } from '@google/genai'

// Models are tried in this order: the lite alias first (it is the fast, cheap class, and today it points at
// `gemini-3.5-flash-lite`), then other models that may have capacity or may be open to older accounts.
// GEMINI_MODEL replaces the list with one model.
const MODELS = process.env.GEMINI_MODEL
  ? [process.env.GEMINI_MODEL]
  : ['gemini-flash-lite-latest', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite', 'gemini-flash-latest']

// 404: this key cannot use the model (accounts differ). 503: the model is out of capacity right now.
// In both cases another model may still answer, and the SDK does not retry either by itself.
const TRY_NEXT_MODEL_ON = new Set([404, 503])

async function withModelFallback(run) {
  for (const [index, model] of MODELS.entries()) {
    try {
      return await run(model)
    } catch (error) {
      const isLastModel = index === MODELS.length - 1
      if (!(error instanceof ApiError) || !TRY_NEXT_MODEL_ON.has(error.status) || isLastModel) throw error
    }
  }
}

// Message roles are "user" and "assistant"; Gemini calls the second one "model".
const toContents = (messages) =>
  messages.map(({ role, content }) => ({
    role: role === 'assistant' ? 'model' : 'user',
    parts: [{ text: content }],
  }))

/** Streams the model's reply as text chunks. */
export async function* streamGemini({ apiKey, system, messages, signal }) {
  const ai = new GoogleGenAI({ apiKey })
  const stream = await withModelFallback((model) =>
    ai.models.generateContentStream({
      model,
      contents: toContents(messages),
      config: { systemInstruction: system, abortSignal: signal },
    }),
  )

  for await (const chunk of stream) {
    if (chunk.text) yield chunk.text
  }
}

/** Asks for one answer that follows the JSON `schema` and returns it parsed. Throws a SyntaxError if the text is not JSON. */
export async function generateJson({ apiKey, system, prompt, schema, signal }) {
  const ai = new GoogleGenAI({ apiKey })
  const response = await withModelFallback((model) =>
    ai.models.generateContent({
      model,
      contents: toContents([{ role: 'user', content: prompt }]),
      config: {
        systemInstruction: system,
        responseMimeType: 'application/json',
        responseJsonSchema: schema,
        abortSignal: signal,
      },
    }),
  )
  return JSON.parse(response.text)
}

/** Turns a provider failure into an HTTP status, a code the UI can act on, and a message that is safe to show. */
export function describeGeminiError(error) {
  const status = error instanceof ApiError ? error.status : undefined

  if (status === 401 || status === 403 || /api key not valid|api_key_invalid/i.test(error.message)) {
    return { status: 401, code: 'invalid_key', message: 'Gemini rejected this API key. Check that you pasted it correctly.' }
  }
  if (status === 429) {
    return { status: 429, code: 'rate_limited', message: 'Gemini is rate limiting this key. Wait a minute and try again.' }
  }
  if (status === 404) {
    return { status: 502, code: 'model_unavailable', message: 'None of the Gemini models this app uses are available for this key.' }
  }
  if (status >= 500) {
    return { status: 503, code: 'provider_unavailable', message: 'Gemini is busy or temporarily unavailable. Try again in a moment.' }
  }
  return { status: 502, code: 'provider_error', message: 'Gemini could not complete the request.' }
}
