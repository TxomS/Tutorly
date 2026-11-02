import { currentStep, progressOf } from './lesson.js'

// Only the latest part of the chat is sent: older messages cost tokens and the plan already holds the lesson.
const RECENT_MESSAGES = 10
const ROLE_FOR_SERVER = { tutor: 'assistant', student: 'user' }

const pickStep = ({ title, goal, keyPoints, checkQuestion, expectedAnswer, hints }) => ({ title, goal, keyPoints, checkQuestion, expectedAnswer, hints })

const recentMessages = (messages) =>
  messages.slice(-RECENT_MESSAGES).map(({ role, content }) => ({ role: ROLE_FOR_SERVER[role], content }))

function passagesFor(lesson, steps) {
  const ids = new Set(steps.flatMap((step) => step.sourceIds))
  return lesson.passages.filter(({ id }) => ids.has(id))
}

/** The body for /api/assess: the step being answered, its source passages, the recent chat, and the student's answer. */
export function assessRequest(lesson, messages, answer) {
  const step = currentStep(lesson)
  return { step: pickStep(step), passages: passagesFor(lesson, [step]), messages: recentMessages(messages), answer }
}

/**
 * The body for /api/teach. `before` and `after` are the lesson before and after the move was applied, so that a tutor
 * reply that moves on can talk about the step just finished and introduce the new one.
 */
export function teachRequest({ before, after, move, feedback, messages }) {
  const moving = move.type === 'advance' || move.type === 'finish'
  const previousStep = moving ? currentStep(before) : undefined
  const step = move.type === 'finish' ? undefined : currentStep(after)
  const { plan } = after
  // A redirect needs only the student's last message: older chat can carry the answer into it.
  const chat = move.type === 'redirect' ? messages.slice(-1) : messages

  return {
    lesson: {
      title: plan.title,
      language: plan.language,
      audience: plan.audience,
      style: plan.style,
      askFirst: plan.askFirst,
      outline: plan.steps.map((planStep) => planStep.title),
      progress: { current: progressOf(after).current, total: progressOf(after).total },
    },
    move,
    step: step && pickStep(step),
    previousStep: previousStep && pickStep(previousStep),
    feedback,
    passages: passagesFor(after, [step, previousStep].filter(Boolean)),
    messages: recentMessages(chat),
  }
}
