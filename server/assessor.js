import { ASSESSOR_SYSTEM_PROMPT } from './prompts.js'
import { parseMessages, parsePassages, parseStep, readText } from './requests.js'
import { askForJson, InvalidAnswer } from './structured.js'

export const VERDICTS = ['correct', 'partial', 'wrong', 'gave_up', 'question', 'off_topic']

const MAX_ANSWER_CHARS = 2_000

const ASSESSMENT_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: VERDICTS, description: 'How the student reply relates to the check question' },
    feedback: { type: 'string', description: 'One or two sentences for the tutor: what is right and what is missing' },
  },
  required: ['verdict', 'feedback'],
}

/** Checks the request body and returns what the grader needs, or throws an HttpError the client can show. */
export function parseAssessRequest(body) {
  return {
    step: parseStep(body?.step),
    passages: parsePassages(body?.passages),
    messages: parseMessages(body?.messages ?? []),
    answer: readText(body?.answer, 'answer', MAX_ANSWER_CHARS),
  }
}

/** Returns { verdict, feedback }, or throws an InvalidAnswer when the model's answer is not one of the known verdicts. */
export function validateAssessment(raw) {
  if (!VERDICTS.includes(raw?.verdict)) throw new InvalidAnswer(`verdict must be one of: ${VERDICTS.join(', ')}`)
  return { verdict: raw.verdict, feedback: typeof raw.feedback === 'string' ? raw.feedback.trim() : '' }
}

function buildPrompt({ step, passages, messages, answer }) {
  const source = passages.map(({ id, text }) => `[${id}]\n${text}`).join('\n\n')
  const chat = messages.map(({ role, content }) => `${role === 'user' ? 'Student' : 'Tutor'}: ${content}`).join('\n')
  return [
    `<step>\nCheck question: ${step.checkQuestion}\nExpected answer: ${step.expectedAnswer}\nKey points:\n${step.keyPoints.map((point) => `- ${point}`).join('\n')}\n</step>`,
    `<source>\n${source}\n</source>`,
    `<conversation>\n${chat}\n</conversation>`,
    `<student_reply>\n${answer}\n</student_reply>`,
  ].join('\n\n')
}

/** Grades the student's latest reply against the step's check question. */
export function assessAnswer({ apiKey, step, passages, messages, answer, signal }) {
  return askForJson({
    apiKey,
    system: ASSESSOR_SYSTEM_PROMPT,
    prompt: buildPrompt({ step, passages, messages, answer }),
    schema: ASSESSMENT_SCHEMA,
    validate: validateAssessment,
    failure: { code: 'assessment_invalid', message: 'Could not check that answer. Please try again.' },
    signal,
  })
}
