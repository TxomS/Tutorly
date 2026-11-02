import { generateJson } from './gemini.js'
import { HttpError } from './http.js'

const ATTEMPTS = 2

/** Thrown by a validator when the model's answer is not usable; the model then gets another try. */
export class InvalidAnswer extends Error {}

/**
 * Asks Gemini for JSON that follows `schema`, checks it with `validate`, and retries once with the reason when the answer
 * is not usable. After the last try it throws an HttpError built from `failure` ({ code, message }).
 */
export async function askForJson({ apiKey, system, prompt, schema, validate, failure, signal }) {
  let problem = ''

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const retryNote = problem ? `\n\nYour previous answer was rejected: ${problem}. Answer again and fix this.` : ''
    try {
      return validate(await generateJson({ apiKey, system, prompt: prompt + retryNote, schema, signal }))
    } catch (error) {
      if (!(error instanceof InvalidAnswer || error instanceof SyntaxError)) throw error
      problem = error.message
    }
  }
  throw new HttpError(502, failure.code, failure.message)
}
