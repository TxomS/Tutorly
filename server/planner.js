import { MAX_SOURCE_CHARS } from '../shared/limits.js'
import { HttpError } from './http.js'
import { PLANNER_SYSTEM_PROMPT } from './prompts.js'
import { askForJson, InvalidAnswer } from './structured.js'

const MAX_REQUEST_CHARS = 2_000
const MAX_STEPS = 12

const text = (description) => ({ type: 'string', description })
const list = (items, description) => ({ type: 'array', items, description })

// The shape Gemini must answer in. `validatePlan` still checks the answer, because a schema does not guarantee sense.
const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    title: text('A short lesson title'),
    language: text('The language of the lesson, for example "French"'),
    audience: text('Who is learning'),
    style: text('How to teach, for example "Socratic"'),
    durationMinutes: { type: 'integer', description: 'Length of the lesson in minutes' },
    askFirst: { type: 'boolean', description: 'True when the tutor should ask questions before explaining, for example in a Socratic style' },
    steps: {
      type: 'array',
      minItems: 1,
      maxItems: MAX_STEPS,
      items: {
        type: 'object',
        properties: {
          title: text('A short step title'),
          goal: text('What the student should understand after this step'),
          keyPoints: list({ type: 'string' }, 'The facts from the source to teach in this step'),
          checkQuestion: text('A question that checks understanding of this step'),
          expectedAnswer: text('What a correct answer contains'),
          hints: {
            ...list({ type: 'string' }, 'Exactly two hints for a student who is stuck, from vague to specific. A hint never states the answer'),
            minItems: 2,
            maxItems: 2,
          },
          sourceIds: list({ type: 'string' }, 'Ids of the source passages this step is based on, for example "p3"'),
        },
        required: ['title', 'goal', 'keyPoints', 'checkQuestion', 'expectedAnswer', 'hints', 'sourceIds'],
      },
    },
  },
  required: ['title', 'language', 'audience', 'style', 'durationMinutes', 'askFirst', 'steps'],
}

/** Checks the request body and returns what the planner needs, or throws an HttpError the client can show. */
export function parsePlanRequest(body) {
  const teacherPrompt = typeof body?.teacherPrompt === 'string' ? body.teacherPrompt.trim() : ''
  if (!teacherPrompt) throw new HttpError(400, 'bad_request', 'Write what the lesson should be like.')
  if (teacherPrompt.length > MAX_REQUEST_CHARS) {
    throw new HttpError(400, 'prompt_too_long', `Keep the lesson request under ${MAX_REQUEST_CHARS} characters.`)
  }

  const passages = body?.passages
  const wellFormed =
    Array.isArray(passages) &&
    passages.length > 0 &&
    passages.every((passage) => typeof passage?.id === 'string' && typeof passage?.text === 'string' && passage.text.trim())
  if (!wellFormed) throw new HttpError(400, 'bad_request', 'The source has no readable text.')
  if (new Set(passages.map(({ id }) => id)).size !== passages.length) {
    throw new HttpError(400, 'bad_request', 'The source passages must have unique ids.')
  }

  const sourceChars = passages.reduce((total, { text }) => total + text.length, 0)
  if (sourceChars > MAX_SOURCE_CHARS) {
    throw new HttpError(413, 'source_too_large', `The source is too long. The limit is ${MAX_SOURCE_CHARS.toLocaleString('en-US')} characters.`)
  }
  return { teacherPrompt, passages }
}

/** Returns a clean plan, or throws an InvalidAnswer saying what is wrong. Passage ids the model invented are dropped. */
export function validatePlan(raw, passages) {
  const knownIds = new Set(passages.map(({ id }) => id))
  const needText = (value, field) => {
    if (typeof value !== 'string' || !value.trim()) throw new InvalidAnswer(`${field} is missing`)
    return value.trim()
  }

  if (!Array.isArray(raw?.steps) || raw.steps.length === 0 || raw.steps.length > MAX_STEPS) {
    throw new InvalidAnswer(`the plan needs between 1 and ${MAX_STEPS} steps`)
  }
  if (!Number.isFinite(raw.durationMinutes) || raw.durationMinutes <= 0) throw new InvalidAnswer('durationMinutes is missing')
  if (typeof raw.askFirst !== 'boolean') throw new InvalidAnswer('askFirst is missing')

  return {
    title: needText(raw.title, 'title'),
    language: needText(raw.language, 'language'),
    audience: needText(raw.audience, 'audience'),
    style: needText(raw.style, 'style'),
    durationMinutes: Math.round(raw.durationMinutes),
    askFirst: raw.askFirst,
    steps: raw.steps.map((step, index) => {
      const label = `step ${index + 1}`
      const keyPoints = Array.isArray(step?.keyPoints) ? step.keyPoints.map((point) => needText(point, `${label} key point`)) : []
      if (keyPoints.length === 0) throw new InvalidAnswer(`${label} has no key points`)

      const hints = Array.isArray(step.hints) ? step.hints.map((hint) => needText(hint, `${label} hint`)) : []
      if (hints.length !== 2) throw new InvalidAnswer(`${label} needs exactly two hints`)

      const sourceIds = [...new Set(Array.isArray(step.sourceIds) ? step.sourceIds : [])].filter((id) => knownIds.has(id))
      if (sourceIds.length === 0) throw new InvalidAnswer(`${label} cites no passage from the source`)

      return {
        id: `step-${index + 1}`,
        title: needText(step.title, `${label} title`),
        goal: needText(step.goal, `${label} goal`),
        keyPoints,
        checkQuestion: needText(step.checkQuestion, `${label} check question`),
        expectedAnswer: needText(step.expectedAnswer, `${label} expected answer`),
        hints,
        sourceIds,
      }
    }),
  }
}

function buildPrompt(teacherPrompt, passages) {
  const source = passages.map(({ id, text: passage }) => `[${id}]\n${passage}`).join('\n\n')
  return `<teacher_request>\n${teacherPrompt}\n</teacher_request>\n\n<source>\n${source}\n</source>`
}

/** Asks Gemini for a lesson plan and returns it validated. Retries once if the first answer is not usable. */
export function createPlan({ apiKey, teacherPrompt, passages, signal }) {
  return askForJson({
    apiKey,
    system: PLANNER_SYSTEM_PROMPT,
    prompt: buildPrompt(teacherPrompt, passages),
    schema: PLAN_SCHEMA,
    validate: (raw) => validatePlan(raw, passages),
    failure: { code: 'plan_invalid', message: 'Could not build a valid lesson plan. Try again, or use a shorter source.' },
    signal,
  })
}
