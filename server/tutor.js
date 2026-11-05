import { HttpError } from './http.js'
import { parseMessages, parsePassages, parseStep, readText } from './requests.js'

const MOVES = ['introduce', 'hint', 'probe', 'answer_question', 'redirect', 'advance', 'checkpoint', 'resume', 'finish']
const MAX_LEVEL = 5

const bad = (what) => new HttpError(400, 'bad_request', `The request has an invalid ${what}.`)

function parseLesson(lesson) {
  const { current, total } = lesson?.progress ?? {}
  const outline = lesson?.outline
  if (!Number.isInteger(current) || !Number.isInteger(total) || current < 1 || total < current) throw bad('lesson progress')
  if (!Array.isArray(outline) || outline.length === 0 || outline.length > 12) throw bad('lesson outline')
  return {
    title: readText(lesson.title, 'lesson', 300),
    language: readText(lesson.language, 'lesson', 100),
    audience: readText(lesson.audience, 'lesson', 300),
    style: readText(lesson.style, 'lesson', 300),
    outline: outline.map((title) => readText(title, 'lesson outline', 300)),
    askFirst: lesson.askFirst !== false,
    progress: { current, total },
  }
}

function parseMove(move) {
  if (!MOVES.includes(move?.type)) throw bad('move')
  const level = Number.isInteger(move.level) && move.level >= 1 && move.level <= MAX_LEVEL ? move.level : 1
  return { type: move.type, level, revealed: move.revealed === true }
}

// Gemini needs the conversation to end with the student's turn, and at the start of a lesson there is none yet.
const withStudentTurn = (messages) =>
  messages.at(-1)?.role === 'user' ? messages : [...messages, { role: 'user', content: '(The student is ready.)' }]

/** Checks the request body for the tutor and returns it cleaned, or throws an HttpError the client can show. */
export function parseTeachRequest(body) {
  const move = parseMove(body?.move)
  // A move that wraps up a step talks about the step just finished. 'checkpoint' and 'finish' stop there; 'resume' is the one that starts the next step.
  const needsStep = move.type !== 'finish' && move.type !== 'checkpoint'
  const needsPreviousStep = move.type === 'advance' || move.type === 'checkpoint' || move.type === 'finish'
  const feedback = body?.feedback == null || body.feedback === '' ? undefined : readText(body.feedback, 'feedback', 1_000)

  return {
    lesson: parseLesson(body?.lesson),
    move,
    step: needsStep ? parseStep(body?.step) : undefined,
    previousStep: needsPreviousStep ? parseStep(body?.previousStep) : undefined,
    feedback,
    passages: parsePassages(body?.passages ?? []),
    messages: withStudentTurn(parseMessages(body?.messages ?? [])),
  }
}
