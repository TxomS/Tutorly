import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyVerdict, createLesson } from './lesson.js'
import { assessRequest, teachRequest } from './turns.js'

const step = (n) => ({
  id: `step-${n}`,
  title: `Step ${n}`,
  goal: `Goal ${n}`,
  keyPoints: [`Point ${n}`],
  checkQuestion: `Question ${n}?`,
  expectedAnswer: `Answer ${n}`,
  hints: [`Hint ${n}.1`, `Hint ${n}.2`],
  sourceIds: [`p${n}`],
})
const passages = [1, 2, 3].map((n) => ({ id: `p${n}`, text: `Passage ${n}` }))
const plan = { title: 'Photosynthesis', language: 'French', audience: '7th graders', style: 'Socratic', durationMinutes: 15, askFirst: true, steps: [1, 2, 3].map(step) }
const lesson = () => createLesson(plan, passages)

const chat = (count) =>
  Array.from({ length: count }, (_, i) => ({ id: `m${i}`, role: i % 2 === 0 ? 'tutor' : 'student', content: `message ${i}` }))

test('assessRequest sends the current step, only its passages, and the chat with the roles the server expects', () => {
  const request = assessRequest(lesson(), chat(2), 'my answer')

  assert.equal(request.answer, 'my answer')
  assert.equal(request.step.checkQuestion, 'Question 1?')
  assert.equal('sourceIds' in request.step, false)
  assert.deepEqual(request.passages, [passages[0]])
  assert.deepEqual(request.messages, [
    { role: 'assistant', content: 'message 0' },
    { role: 'user', content: 'message 1' },
  ])
})

test('only the latest 10 messages are sent', () => {
  const request = assessRequest(lesson(), chat(25), 'x')

  assert.equal(request.messages.length, 10)
  assert.equal(request.messages[0].content, 'message 15')
})

test('a hint stays on the same step and sends only that step', () => {
  const before = lesson()
  const { lesson: after, move } = applyVerdict(before, 'wrong')
  const request = teachRequest({ before, after, move, feedback: 'Missing the sunlight', messages: chat(3) })

  assert.deepEqual(request.move, { type: 'hint', level: 1 })
  assert.equal(request.step.title, 'Step 1')
  assert.deepEqual(request.step.hints, ['Hint 1.1', 'Hint 1.2'])
  assert.equal(request.previousStep, undefined)
  assert.deepEqual(request.passages, [passages[0]])
  assert.equal(request.feedback, 'Missing the sunlight')
  assert.equal(request.lesson.language, 'French')
  assert.deepEqual(request.lesson.progress, { current: 1, total: 3 })
  assert.deepEqual(request.lesson.outline, ['Step 1', 'Step 2', 'Step 3'])
})

test('moving on sends the new step, the finished step, and the passages of both', () => {
  const before = lesson()
  const { lesson: after, move } = applyVerdict(before, 'correct')
  const request = teachRequest({ before, after, move, messages: chat(2) })

  assert.equal(request.step.title, 'Step 2')
  assert.equal(request.previousStep.title, 'Step 1')
  assert.deepEqual(request.passages.map(({ id }) => id).sort(), ['p1', 'p2'])
  assert.deepEqual(request.lesson.progress, { current: 2, total: 3 })
})

test('the closing message sends the last step as the finished one, with no new step', () => {
  let current = lesson()
  for (let i = 0; i < 2; i++) current = applyVerdict(current, 'correct').lesson
  const { lesson: after, move } = applyVerdict(current, 'correct')
  const request = teachRequest({ before: current, after, move, messages: chat(2) })

  assert.equal(move.type, 'finish')
  assert.equal(request.step, undefined)
  assert.equal(request.previousStep.title, 'Step 3')
  assert.deepEqual(request.lesson.progress, { current: 3, total: 3 })
})

test('a redirect gets only the student\'s last message, so earlier chat cannot carry the answer into it', () => {
  const before = lesson()
  const redirect = teachRequest({ before, after: before, move: { type: 'redirect' }, messages: chat(5) })
  const hint = teachRequest({ before, after: before, move: { type: 'hint', level: 1 }, messages: chat(5) })

  assert.deepEqual(redirect.messages, [{ role: 'assistant', content: 'message 4' }])
  assert.equal(hint.messages.length, 5)
})

test('the lesson style, and whether it asks first, travel with every request', () => {
  const before = lesson()
  const asksFirst = teachRequest({ before, after: before, move: { type: 'introduce' }, messages: [] })
  const explainsFirst = teachRequest({ before: createLesson({ ...plan, askFirst: false }, passages), after: createLesson({ ...plan, askFirst: false }, passages), move: { type: 'introduce' }, messages: [] })

  assert.equal(asksFirst.lesson.askFirst, true)
  assert.equal(explainsFirst.lesson.askFirst, false)
})

test('the first message of a lesson needs no chat history', () => {
  const start = lesson()
  const request = teachRequest({ before: start, after: start, move: { type: 'introduce' }, messages: [] })

  assert.deepEqual(request.messages, [])
  assert.equal(request.step.title, 'Step 1')
})
