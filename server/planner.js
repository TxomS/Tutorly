import { generateJson } from './gemini.js'
import { HttpError } from './http.js'
import { PLANNER_SYSTEM_PROMPT } from './prompts.js'

const MAX_REQUEST_CHARS = 2_000
const MAX_SOURCE_CHARS = 300_000
const MAX_STEPS = 12
const ATTEMPTS = 2

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
          sourceIds: list({ type: 'string' }, 'Ids of the source passages this step is based on, for example "p3"'),
        },
        required: ['title', 'goal', 'keyPoints', 'checkQuestion', 'expectedAnswer', 'sourceIds'],
      },
    },
  },
  required: ['title', 'language', 'audience', 'style', 'durationMinutes', 'steps'],
}

/** Raised when the model's answer is not a usable plan; the model gets one more try. */
class PlanError extends Error {}

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

/** Returns a clean plan, or throws a PlanError saying what is wrong. Passage ids the model invented are dropped. */
export function validatePlan(raw, passages) {
  const knownIds = new Set(passages.map(({ id }) => id))
  const needText = (value, field) => {
    if (typeof value !== 'string' || !value.trim()) throw new PlanError(`${field} is missing`)
    return value.trim()
  }

  if (!Array.isArray(raw?.steps) || raw.steps.length === 0 || raw.steps.length > MAX_STEPS) {
    throw new PlanError(`the plan needs between 1 and ${MAX_STEPS} steps`)
  }
  if (!Number.isFinite(raw.durationMinutes) || raw.durationMinutes <= 0) throw new PlanError('durationMinutes is missing')

  return {
    title: needText(raw.title, 'title'),
    language: needText(raw.language, 'language'),
    audience: needText(raw.audience, 'audience'),
    style: needText(raw.style, 'style'),
    durationMinutes: Math.round(raw.durationMinutes),
    steps: raw.steps.map((step, index) => {
      const label = `step ${index + 1}`
      const keyPoints = Array.isArray(step?.keyPoints) ? step.keyPoints.map((point) => needText(point, `${label} key point`)) : []
      if (keyPoints.length === 0) throw new PlanError(`${label} has no key points`)

      const sourceIds = [...new Set(Array.isArray(step.sourceIds) ? step.sourceIds : [])].filter((id) => knownIds.has(id))
      if (sourceIds.length === 0) throw new PlanError(`${label} cites no passage from the source`)

      return {
        id: `step-${index + 1}`,
        title: needText(step.title, `${label} title`),
        goal: needText(step.goal, `${label} goal`),
        keyPoints,
        checkQuestion: needText(step.checkQuestion, `${label} check question`),
        expectedAnswer: needText(step.expectedAnswer, `${label} expected answer`),
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
export async function createPlan({ apiKey, teacherPrompt, passages, signal }) {
  const prompt = buildPrompt(teacherPrompt, passages)
  let problem = ''

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const retryNote = problem ? `\n\nYour previous answer was rejected: ${problem}. Answer again and fix this.` : ''
    try {
      const raw = await generateJson({ apiKey, system: PLANNER_SYSTEM_PROMPT, prompt: prompt + retryNote, schema: PLAN_SCHEMA, signal })
      return validatePlan(raw, passages)
    } catch (error) {
      if (!(error instanceof PlanError || error instanceof SyntaxError)) throw error
      problem = error.message
    }
  }
  throw new HttpError(502, 'plan_invalid', 'Could not build a valid lesson plan. Try again, or use a shorter source.')
}
