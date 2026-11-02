import { HttpError } from './http.js'

const MAX_TEXT_CHARS = 4_000

const invalid = (what) => new HttpError(400, 'bad_request', `The request has an invalid ${what}.`)

/** Returns the trimmed text, or throws a 400 saying which part of the request is wrong. */
export function readText(value, what, maxChars = MAX_TEXT_CHARS) {
  if (typeof value !== 'string' || !value.trim() || value.length > maxChars) throw invalid(what)
  return value.trim()
}

/** A lesson step as the browser sends it. The hints are optional: the tutor falls back to a general nudge without them. */
export function parseStep(step) {
  const keyPoints = step?.keyPoints
  const hints = step?.hints ?? []
  if (!Array.isArray(keyPoints) || keyPoints.length === 0 || keyPoints.length > 20) throw invalid('lesson step')
  if (!Array.isArray(hints) || hints.length > 3) throw invalid('lesson step')
  return {
    title: readText(step.title, 'lesson step'),
    goal: readText(step.goal, 'lesson step'),
    keyPoints: keyPoints.map((point) => readText(point, 'lesson step')),
    checkQuestion: readText(step.checkQuestion, 'lesson step'),
    expectedAnswer: readText(step.expectedAnswer, 'lesson step'),
    hints: hints.map((hint) => readText(hint, 'lesson step')),
  }
}

/** The source passages a step is based on. */
export function parsePassages(passages) {
  if (!Array.isArray(passages) || passages.length > 12) throw invalid('source')
  return passages.map((passage) => ({ id: readText(passage?.id, 'source', 20), text: readText(passage?.text, 'source', 5_000) }))
}

/** The recent chat, as [{ role: "user" | "assistant", content }]. */
export function parseMessages(messages) {
  if (!Array.isArray(messages) || messages.length > 20) throw invalid('conversation')
  return messages.map((message) => {
    if (message?.role !== 'user' && message?.role !== 'assistant') throw invalid('conversation')
    return { role: message.role, content: readText(message.content, 'conversation') }
  })
}
