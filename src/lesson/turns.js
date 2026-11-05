import { currentStep, passagesWithIds, progressOf } from './lesson.js'

// Only the latest part of the chat is sent: older messages cost tokens and the plan already holds the lesson.
const RECENT_MESSAGES = 10
const ROLE_FOR_SERVER = { tutor: 'assistant', student: 'user' }

const pickStep = ({ title, goal, keyPoints, checkQuestion, expectedAnswer, hints }) => ({ title, goal, keyPoints, checkQuestion, expectedAnswer, hints })

// The tutor needs a step's key terms only to say them when the step is wrapped up, so only the finished step carries them.
const pickFinishedStep = (step) => ({ ...pickStep(step), terms: step.terms })

const recentMessages = (messages) =>
  messages.slice(-RECENT_MESSAGES).map(({ role, content }) => ({ role: ROLE_FOR_SERVER[role], content }))

const passagesFor = (lesson, steps) => passagesWithIds(lesson, steps.flatMap((step) => step.sourceIds))

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
  const wrapsUp = move.type === 'advance' || move.type === 'checkpoint' || move.type === 'finish'
  const previousStep = wrapsUp ? currentStep(before) : undefined
  // The closing message and the pause for the match-up game stop at the finished step: the next one has not been started.
  const step = move.type === 'finish' || move.type === 'checkpoint' ? undefined : currentStep(after)
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
    previousStep: previousStep && pickFinishedStep(previousStep),
    feedback,
    passages: passagesFor(after, [step, previousStep].filter(Boolean)),
    messages: recentMessages(chat),
  }
}
