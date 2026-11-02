import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyVerdict, createLesson, currentStep, MAX_ATTEMPTS, progressOf } from './lesson.js'

const step = (n) => ({
  id: `step-${n}`,
  title: `Step ${n}`,
  goal: 'Goal',
  keyPoints: ['Point'],
  checkQuestion: 'Question?',
  expectedAnswer: 'Answer',
  sourceIds: [`p${n}`],
})
const newLesson = (stepCount = 3) =>
  createLesson({ title: 'T', language: 'English', audience: 'kids', style: 'Socratic', durationMinutes: 10, steps: Array.from({ length: stepCount }, (_, i) => step(i + 1)) }, [])

test('a lesson starts on the first step with no failed attempts', () => {
  const lesson = newLesson()

  assert.equal(currentStep(lesson).title, 'Step 1')
  assert.equal(lesson.attempts, 0)
  assert.deepEqual(progressOf(lesson), { current: 1, total: 3, finished: false })
})

test('a correct answer moves to the next step', () => {
  const { lesson, move } = applyVerdict(newLesson(), 'correct')

  assert.deepEqual(move, { type: 'advance', revealed: false })
  assert.equal(currentStep(lesson).title, 'Step 2')
  assert.deepEqual(lesson.outcomes, ['correct'])
  assert.deepEqual(progressOf(lesson), { current: 2, total: 3, finished: false })
})

test('a correct answer on the last step finishes the lesson', () => {
  const { lesson, move } = applyVerdict(newLesson(1), 'correct')

  assert.deepEqual(move, { type: 'finish', revealed: false })
  assert.equal(lesson.finished, true)
  assert.deepEqual(progressOf(lesson), { current: 1, total: 1, finished: true })
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
  assert.deepEqual(third.lesson.outcomes, ['revealed'])
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
  assert.deepEqual(lesson.outcomes, ['correct'])
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

test('a whole lesson: correct, three failures, correct', () => {
  let lesson = newLesson(3)
  const moves = []
  for (const verdict of ['correct', 'wrong', 'wrong', 'wrong', 'correct']) {
    const result = applyVerdict(lesson, verdict)
    lesson = result.lesson
    moves.push(result.move.type + (result.move.revealed ? ':revealed' : ''))
  }

  assert.deepEqual(moves, ['advance', 'hint', 'hint', 'advance:revealed', 'finish'])
  assert.deepEqual(lesson.outcomes, ['correct', 'revealed', 'correct'])
  assert.equal(lesson.finished, true)
})
