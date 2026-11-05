// The lesson's state and rules. Pure functions only: nothing here talks to the server or to React.
import { planReview } from './review.js'

/** The third failed answer on a step ends it: the tutor explains the answer and moves on. */
export const MAX_ATTEMPTS = 3

/** The most a step can earn: all of them for a correct first answer, one fewer for each failed attempt before it. */
export const MAX_STARS = 3

/** Stars for a finished step. A correct answer always earns at least one, and a step the tutor had to explain earns none. */
export const starsFor = (result, failedAttempts) => (result === 'correct' ? Math.max(1, MAX_STARS - failedAttempts) : 0)

// `review` is the match-up game, or null when the lesson has none. Its phase is "upcoming", then "waiting" (the lesson is paused for the game), then "done".
export function createLesson(plan, passages) {
  return { plan, passages, stepIndex: 0, attempts: 0, outcomes: [], finished: false, review: planReview(plan.steps) }
}

export const currentStep = (lesson) => lesson.plan.steps[lesson.stepIndex]

/** True while the lesson is paused for the match-up game. The step just finished is still the current one until the game is over. */
export const isReviewing = (lesson) => lesson.review?.phase === 'waiting'

/** The source passages with the given ids, in the order they appear in the source. */
export const passagesWithIds = (lesson, ids) => lesson.passages.filter(({ id }) => ids.includes(id))

/** The step a tutor message is about: the new step after moving on, otherwise the step being worked on (the last one, for the closing message). */
export const stepForMove = (before, after, move) => currentStep(move.type === 'advance' || move.type === 'resume' ? after : before)

/** Where the student is, for the "Step 3 of 5" display. */
export function progressOf(lesson) {
  const total = lesson.plan.steps.length
  return { current: lesson.finished ? total : lesson.stepIndex + 1, total, finished: lesson.finished, reviewing: isReviewing(lesson) }
}

/** The stars earned so far and the most this lesson could give. */
export const starsOf = (lesson) => ({
  earned: lesson.outcomes.reduce((total, { stars }) => total + stars, 0),
  possible: lesson.plan.steps.length * MAX_STARS,
})

// Each finished step leaves an outcome: { result: 'correct' | 'revealed', stars }.
function finishStep(lesson, result) {
  const outcomes = [...lesson.outcomes, { result, stars: starsFor(result, lesson.attempts) }]
  const revealed = result === 'revealed'
  if (lesson.stepIndex === lesson.plan.steps.length - 1) {
    return { lesson: { ...lesson, outcomes, attempts: 0, finished: true }, move: { type: 'finish', revealed } }
  }
  const { review } = lesson
  if (review?.phase === 'upcoming' && lesson.stepIndex + 1 === review.after) {
    // Pause for the match-up game. The step index stays where it is until the game is over, so the next step has not been started.
    return { lesson: { ...lesson, outcomes, attempts: 0, review: { ...review, phase: 'waiting' } }, move: { type: 'checkpoint', revealed } }
  }
  return { lesson: { ...lesson, outcomes, attempts: 0, stepIndex: lesson.stepIndex + 1 }, move: { type: 'advance', revealed } }
}

/** The match-up game is over (played or skipped): start the next step. Call it only while the lesson is paused for the game. */
export function finishReview(lesson) {
  return {
    lesson: { ...lesson, stepIndex: lesson.stepIndex + 1, review: { ...lesson.review, phase: 'done' } },
    move: { type: 'resume' },
  }
}

/**
 * Decides what happens after the student's answer was graded. This is the lesson's rulebook, and it is code, not the model:
 * - correct: the next step (or the end). After the middle step of a lesson with a match-up game, the lesson pauses for the game instead.
 * - question or off_topic: stay on the step; no attempt is used, so asking never costs a star.
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
