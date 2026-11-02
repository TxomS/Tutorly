import assert from 'node:assert/strict'
import { test } from 'node:test'
import { chatReducer, initialChat } from './chatReducer.js'

const run = (...actions) => actions.reduce(chatReducer, initialChat)
const lesson = { stepIndex: 0, finished: false }
const student = { id: 's1', role: 'student', content: 'My answer' }

test('a lesson starts with an empty chat that waits for the tutor', () => {
  const state = run({ type: 'begun', lesson })

  assert.equal(state.lesson, lesson)
  assert.deepEqual(state.messages, [])
  assert.equal(state.status, 'idle')
})

test('the tutor writes a message piece by piece and then it is complete', () => {
  const state = run(
    { type: 'begun', lesson },
    { type: 'replyStarted', id: 't1', sourceIds: ['p1', 'p2'] },
    { type: 'replyText', id: 't1', text: 'Hello ' },
    { type: 'replyText', id: 't1', text: 'there' },
  )

  assert.equal(state.status, 'replying')
  assert.equal(state.replyOwed, true)
  assert.deepEqual(state.messages, [{ id: 't1', role: 'tutor', content: 'Hello there', sourceIds: ['p1', 'p2'], complete: false }])

  const done = chatReducer(state, { type: 'replyDone', id: 't1' })
  assert.equal(done.status, 'idle')
  assert.equal(done.replyOwed, false)
  assert.equal(done.messages[0].complete, true)
})

test('an answer is graded before the tutor replies, and the lesson moves on at once', () => {
  const next = { stepIndex: 1, finished: false }
  const state = run({ type: 'begun', lesson }, { type: 'studentSaid', message: student }, { type: 'grading' }, { type: 'graded', lesson: next })

  assert.deepEqual(state.messages, [student])
  assert.equal(state.status, 'grading')
  assert.equal(state.lesson, next)
})

test('stopping keeps the half-written reply, and continuing starts that same message again from the beginning', () => {
  const stopped = run(
    { type: 'begun', lesson },
    { type: 'replyStarted', id: 't1', sourceIds: ['p1'] },
    { type: 'replyText', id: 't1', text: 'Half of a repl' },
    { type: 'stopped' },
  )

  assert.equal(stopped.status, 'stopped')
  assert.equal(stopped.replyOwed, true)
  assert.equal(stopped.messages[0].content, 'Half of a repl')

  const resumed = chatReducer(stopped, { type: 'replyStarted', id: 't1', sourceIds: ['p1'] })
  assert.equal(resumed.messages.length, 1)
  assert.equal(resumed.messages[0].content, '')
  assert.equal(resumed.status, 'replying')
})

test('stopping before the tutor has written anything leaves no empty message behind', () => {
  const stopped = run(
    { type: 'begun', lesson },
    { type: 'studentSaid', message: student },
    { type: 'replyStarted', id: 't1', sourceIds: [] },
    { type: 'stopped' },
  )

  assert.deepEqual(stopped.messages, [student])
  assert.equal(stopped.status, 'stopped')
  assert.equal(stopped.replyOwed, true)

  const resumed = chatReducer(stopped, { type: 'replyStarted', id: 't1', sourceIds: [] })
  assert.deepEqual(resumed.messages.map(({ id }) => id), ['s1', 't1'])
})

test('a reply that fails before any text arrives leaves no empty message behind either', () => {
  const failed = run(
    { type: 'begun', lesson },
    { type: 'studentSaid', message: student },
    { type: 'replyStarted', id: 't1', sourceIds: [] },
    { type: 'failed', error: 'Gemini is busy.' },
  )

  assert.deepEqual(failed.messages, [student])
  assert.equal(failed.status, 'failed')
})

test('a failure shows its message, and trying again clears it', () => {
  const failed = run({ type: 'begun', lesson }, { type: 'grading' }, { type: 'failed', error: 'Gemini is busy.' })
  assert.equal(failed.status, 'failed')
  assert.equal(failed.error, 'Gemini is busy.')

  assert.equal(chatReducer(failed, { type: 'grading' }).error, '')
  assert.equal(chatReducer(failed, { type: 'replyStarted', id: 't1', sourceIds: [] }).error, '')
})

test('answering instead of continuing marks the half-written reply as interrupted and keeps it', () => {
  const state = run(
    { type: 'begun', lesson },
    { type: 'replyStarted', id: 't1', sourceIds: [] },
    { type: 'replyText', id: 't1', text: 'Half' },
    { type: 'stopped' },
    { type: 'abandoned' },
  )

  assert.equal(state.status, 'idle')
  assert.equal(state.replyOwed, false)
  assert.deepEqual(state.messages[0], { id: 't1', role: 'tutor', content: 'Half', sourceIds: [], complete: true, interrupted: true })
})

test('leaving the lesson clears everything, and an unknown action changes nothing', () => {
  const state = run({ type: 'begun', lesson }, { type: 'studentSaid', message: student })

  assert.deepEqual(chatReducer(state, { type: 'left' }), initialChat)
  assert.equal(chatReducer(state, { type: 'nothing' }), state)
})
