// The lesson's state and rules. Pure functions only: nothing here talks to the server or to React.

/** The third failed answer on a step ends it: the tutor explains the answer and moves on. */
export const MAX_ATTEMPTS = 3

export function createLesson(plan, passages) {
  return { plan, passages, stepIndex: 0, attempts: 0, outcomes: [], finished: false }
}

export const currentStep = (lesson) => lesson.plan.steps[lesson.stepIndex]

/** The source passages with the given ids, in the order they appear in the source. */
export const passagesWithIds = (lesson, ids) => lesson.passages.filter(({ id }) => ids.includes(id))

/** The step a tutor message is about: the new step after moving on, otherwise the step being worked on (the last one, for the closing message). */
export const stepForMove = (before, after, move) => currentStep(move.type === 'advance' ? after : before)

/** Where the student is, for the "Step 3 of 5" display. */
export function progressOf(lesson) {
  const total = lesson.plan.steps.length
  return { current: lesson.finished ? total : lesson.stepIndex + 1, total, finished: lesson.finished }
}

function finishStep(lesson, outcome) {
  const outcomes = [...lesson.outcomes, outcome]
  const revealed = outcome === 'revealed'
  if (lesson.stepIndex === lesson.plan.steps.length - 1) {
    return { lesson: { ...lesson, outcomes, attempts: 0, finished: true }, move: { type: 'finish', revealed } }
  }
  return { lesson: { ...lesson, outcomes, attempts: 0, stepIndex: lesson.stepIndex + 1 }, move: { type: 'advance', revealed } }
}

/**
 * Decides what happens after the student's answer was graded. This is the lesson's rulebook, and it is code, not the model:
 * - correct: the next step (or the end).
 * - question or off_topic: stay on the step; no attempt is used.
 * - partial, wrong or gave_up: a failed attempt. A hint (level 1, then 2) while attempts remain, then the answer is explained.
 * Returns the new lesson and the move the tutor should make.
 */
export function applyVerdict(lesson, verdict) {
  if (verdict === 'correct') return finishStep(lesson, 'correct')
  if (verdict === 'question') return { lesson, move: { type: 'answer_question' } }
  if (verdict === 'off_topic') return { lesson, move: { type: 'redirect' } }

  const attempts = lesson.attempts + 1
  if (attempts >= MAX_ATTEMPTS) return finishStep(lesson, 'revealed')
  return { lesson: { ...lesson, attempts }, move: { type: verdict === 'partial' ? 'probe' : 'hint', level: attempts } }
}
