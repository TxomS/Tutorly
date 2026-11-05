import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyVerdict, createLesson, currentStep, finishReview, isReviewing, MAX_ATTEMPTS, MAX_STARS, passagesWithIds, progressOf, starsFor, starsOf, stepForMove } from './lesson.js'

const step = (n) => ({
  id: `step-${n}`,
  title: `Step ${n}`,
  goal: 'Goal',
  keyPoints: ['Point'],
  checkQuestion: 'Question?',
  expectedAnswer: 'Answer',
  sourceIds: [`p${n}`],
})
const stepWithTerms = (n) => ({
  ...step(n),
  terms: [
    { term: `Word ${n}a`, meaning: `Meaning ${n}a` },
    { term: `Word ${n}b`, meaning: `Meaning ${n}b` },
  ],
})
const newLesson = (stepCount = 3, makeStep = step) =>
  createLesson({ title: 'T', language: 'English', audience: 'kids', style: 'Socratic', durationMinutes: 10, steps: Array.from({ length: stepCount }, (_, i) => makeStep(i + 1)) }, [])
// A lesson whose steps have key terms, so it has a match-up game.
const gameLesson = (stepCount = 5) => newLesson(stepCount, stepWithTerms)

test('a lesson starts on the first step with no failed attempts', () => {
  const lesson = newLesson()

  assert.equal(currentStep(lesson).title, 'Step 1')
  assert.equal(lesson.attempts, 0)
  assert.deepEqual(progressOf(lesson), { current: 1, total: 3, finished: false, reviewing: false })
})

test('a correct answer moves to the next step', () => {
  const { lesson, move } = applyVerdict(newLesson(), 'correct')

  assert.deepEqual(move, { type: 'advance', revealed: false })
  assert.equal(currentStep(lesson).title, 'Step 2')
  assert.deepEqual(lesson.outcomes, [{ result: 'correct', stars: 3 }])
  assert.deepEqual(progressOf(lesson), { current: 2, total: 3, finished: false, reviewing: false })
})

test('a correct answer on the last step finishes the lesson', () => {
  const { lesson, move } = applyVerdict(newLesson(1), 'correct')

  assert.deepEqual(move, { type: 'finish', revealed: false })
  assert.equal(lesson.finished, true)
  assert.deepEqual(progressOf(lesson), { current: 1, total: 1, finished: true, reviewing: false })
})

test('a question or an off-topic message stays on the step and uses no attempt', () => {
  const asked = applyVerdict(newLesson(), 'question')
  const strayed = applyVerdict(asked.lesson, 'off_topic')

  assert.deepEqual(asked.move, { type: 'answer_question' })
  assert.deepEqual(strayed.move, { type: 'redirect' })
  assert.equal(strayed.lesson.stepIndex, 0)
  assert.equal(strayed.lesson.attempts, 0)
})

test('wrong answers get two hints, and the third failure explains the answer and moves on', () => {
  assert.equal(MAX_ATTEMPTS, 3)
  const first = applyVerdict(newLesson(), 'wrong')
  const second = applyVerdict(first.lesson, 'wrong')
  const third = applyVerdict(second.lesson, 'wrong')

  assert.deepEqual(first.move, { type: 'hint', level: 1 })
  assert.deepEqual(second.move, { type: 'hint', level: 2 })
  assert.deepEqual(third.move, { type: 'advance', revealed: true })
  assert.deepEqual(third.lesson.outcomes, [{ result: 'revealed', stars: 0 }])
  assert.equal(currentStep(third.lesson).title, 'Step 2')
  assert.equal(third.lesson.attempts, 0)
})

test('a partly right answer gets a probe, and giving up counts as a failed attempt', () => {
  const probed = applyVerdict(newLesson(), 'partial')
  const gaveUp = applyVerdict(probed.lesson, 'gave_up')

  assert.deepEqual(probed.move, { type: 'probe', level: 1 })
  assert.deepEqual(gaveUp.move, { type: 'hint', level: 2 })
  assert.equal(gaveUp.lesson.attempts, 2)
})

test('a correct answer after failed attempts still counts as correct and resets the attempts', () => {
  const failed = applyVerdict(newLesson(), 'wrong')
  const { lesson, move } = applyVerdict(failed.lesson, 'correct')

  assert.deepEqual(move, { type: 'advance', revealed: false })
  assert.deepEqual(lesson.outcomes, [{ result: 'correct', stars: 2 }])
  assert.equal(lesson.attempts, 0)
})

test('the explained answer on the last step ends the lesson with a revealed finish', () => {
  let lesson = newLesson(1)
  let move
  for (let i = 0; i < MAX_ATTEMPTS; i++) ({ lesson, move } = applyVerdict(lesson, 'wrong'))

  assert.deepEqual(move, { type: 'finish', revealed: true })
  assert.equal(lesson.finished, true)
})

test('applying a verdict never changes the lesson it was given', () => {
  const original = newLesson()
  const snapshot = JSON.stringify(original)
  applyVerdict(original, 'correct')
  applyVerdict(original, 'wrong')

  assert.equal(JSON.stringify(original), snapshot)
})

test('a message is about the new step after moving on, and about the current step otherwise', () => {
  const start = newLesson(2)
  const advanced = applyVerdict(start, 'correct')
  const hinted = applyVerdict(start, 'wrong')
  const finished = applyVerdict(advanced.lesson, 'correct')

  assert.equal(stepForMove(start, advanced.lesson, advanced.move).title, 'Step 2')
  assert.equal(stepForMove(start, hinted.lesson, hinted.move).title, 'Step 1')
  assert.equal(stepForMove(advanced.lesson, finished.lesson, finished.move).title, 'Step 2')
})

test('passages are looked up by id and come back in source order', () => {
  const lesson = createLesson(newLesson().plan, [{ id: 'p1', text: 'a' }, { id: 'p2', text: 'b' }, { id: 'p3', text: 'c' }])

  assert.deepEqual(passagesWithIds(lesson, ['p3', 'p1']).map(({ id }) => id), ['p1', 'p3'])
  assert.deepEqual(passagesWithIds(lesson, ['p9']), [])
})

test('a whole lesson: correct, three failures, correct', () => {
  let lesson = newLesson(3)
  const moves = []
  for (const verdict of ['correct', 'wrong', 'wrong', 'wrong', 'correct']) {
    const result = applyVerdict(lesson, verdict)
    lesson = result.lesson
    moves.push(result.move.type + (result.move.revealed ? ':revealed' : ''))
  }

  assert.deepEqual(moves, ['advance', 'hint', 'hint', 'advance:revealed', 'finish'])
  assert.deepEqual(lesson.outcomes, [
    { result: 'correct', stars: 3 },
    { result: 'revealed', stars: 0 },
    { result: 'correct', stars: 3 },
  ])
  assert.equal(lesson.finished, true)
})

test('a step earns fewer stars for each failed attempt before the right answer, and none when the tutor explains it', () => {
  const starsAfter = (verdicts) => {
    let lesson = newLesson()
    for (const verdict of verdicts) ({ lesson } = applyVerdict(lesson, verdict))
    return lesson.outcomes[0].stars
  }

  assert.equal(MAX_STARS, 3)
  assert.equal(starsAfter(['correct']), 3)
  assert.equal(starsAfter(['wrong', 'correct']), 2)
  assert.equal(starsAfter(['partial', 'gave_up', 'correct']), 1)
  assert.equal(starsAfter(['wrong', 'wrong', 'wrong']), 0)
})

test('asking a question or straying off topic never costs a star', () => {
  let lesson = newLesson()
  for (const verdict of ['question', 'off_topic', 'question', 'correct']) ({ lesson } = applyVerdict(lesson, verdict))

  assert.deepEqual(lesson.outcomes, [{ result: 'correct', stars: 3 }])
})

test('a correct answer always earns a star, even if the limit on attempts is raised later', () => {
  assert.equal(starsFor('correct', 7), 1)
  assert.equal(starsFor('revealed', 0), 0)
})

test('the star total counts what was earned against what the whole lesson could give', () => {
  let lesson = newLesson(3)
  assert.deepEqual(starsOf(lesson), { earned: 0, possible: 9 })

  for (const verdict of ['correct', 'wrong', 'correct']) ({ lesson } = applyVerdict(lesson, verdict))
  assert.deepEqual(starsOf(lesson), { earned: 5, possible: 9 })
})

test('a lesson whose steps have no key terms has no match-up game and never pauses', () => {
  let lesson = newLesson(5)
  const moves = []
  for (let i = 0; i < 4; i++) {
    const result = applyVerdict(lesson, 'correct')
    lesson = result.lesson
    moves.push(result.move.type)
  }

  assert.equal(lesson.review, null)
  assert.deepEqual(moves, ['advance', 'advance', 'advance', 'advance'])
})

test('the lesson pauses for the match-up after the middle step, before the next step is started', () => {
  let lesson = gameLesson(5)
  const moves = []
  for (let i = 0; i < 3; i++) {
    const result = applyVerdict(lesson, 'correct')
    lesson = result.lesson
    moves.push(result.move.type)
  }

  assert.deepEqual(moves, ['advance', 'advance', 'checkpoint'])
  assert.equal(isReviewing(lesson), true)
  assert.equal(currentStep(lesson).title, 'Step 3')
  assert.equal(lesson.outcomes.length, 3)
  assert.deepEqual(progressOf(lesson), { current: 3, total: 5, finished: false, reviewing: true })
})

test('the match-up asks only about the steps before the pause, never the steps still to come', () => {
  const { review } = gameLesson(5)

  assert.equal(review.after, 3)
  assert.ok(review.pairs.length > 0)
  assert.ok(review.pairs.every(({ step }) => step <= 3))
  assert.ok(review.pairs.every(({ term }) => !/Word [45]/.test(term)))
})

test('the match-up comes after step 2 of 4, and after step 2 of 3', () => {
  for (const [total, after] of [[4, 2], [3, 2]]) {
    let lesson = gameLesson(total)
    let move
    for (let i = 0; i < after; i++) ({ lesson, move } = applyVerdict(lesson, 'correct'))

    assert.equal(move.type, 'checkpoint', `${total} steps`)
    assert.equal(lesson.stepIndex, after - 1, `${total} steps`)
  }
})

test('when the tutor has to explain the answer on the middle step, the pause says so', () => {
  let lesson = gameLesson(3)
  lesson = applyVerdict(lesson, 'correct').lesson
  let move
  for (let i = 0; i < MAX_ATTEMPTS; i++) ({ lesson, move } = applyVerdict(lesson, 'wrong'))

  assert.deepEqual(move, { type: 'checkpoint', revealed: true })
  assert.deepEqual(lesson.outcomes.at(-1), { result: 'revealed', stars: 0 })
  assert.equal(isReviewing(lesson), true)
})

test('finishing the match-up starts the next step and the lesson carries on without another pause', () => {
  let lesson = gameLesson(5)
  for (let i = 0; i < 3; i++) ({ lesson } = applyVerdict(lesson, 'correct'))
  const paused = lesson

  const resumed = finishReview(paused)
  lesson = resumed.lesson

  assert.deepEqual(resumed.move, { type: 'resume' })
  assert.equal(isReviewing(lesson), false)
  assert.equal(currentStep(lesson).title, 'Step 4')
  assert.deepEqual(progressOf(lesson), { current: 4, total: 5, finished: false, reviewing: false })
  assert.equal(lesson.outcomes.length, 3)

  const moves = []
  for (let i = 0; i < 2; i++) {
    const result = applyVerdict(lesson, 'correct')
    lesson = result.lesson
    moves.push(result.move.type)
  }
  assert.deepEqual(moves, ['advance', 'finish'])
  assert.equal(lesson.finished, true)
})

test('a tutor message after the match-up is about the new step; the one before it is about the step just finished', () => {
  let lesson = gameLesson(5)
  for (let i = 0; i < 2; i++) ({ lesson } = applyVerdict(lesson, 'correct'))
  const before = lesson
  const checkpoint = applyVerdict(before, 'correct')
  const resumed = finishReview(checkpoint.lesson)

  assert.equal(stepForMove(before, checkpoint.lesson, checkpoint.move).title, 'Step 3')
  assert.equal(stepForMove(checkpoint.lesson, resumed.lesson, resumed.move).title, 'Step 4')
})

test('the match-up never changes the stars, and pausing never changes the lesson it was given', () => {
  const original = gameLesson(3)
  const snapshot = JSON.stringify(original)
  const paused = applyVerdict(applyVerdict(original, 'correct').lesson, 'correct').lesson
  const starsBefore = starsOf(paused)
  finishReview(paused)

  assert.equal(JSON.stringify(original), snapshot)
  assert.deepEqual(starsOf(finishReview(paused).lesson), starsBefore)
})
