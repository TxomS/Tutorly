import { useReducer, useRef } from 'react'
import { requestAssessment } from '../api/assessAnswer.js'
import { describeFailure } from '../api/errors.js'
import { postEvents } from '../api/streamEvents.js'
import { chatReducer, initialChat } from './chatReducer.js'
import { applyVerdict, createLesson, stepForMove } from './lesson.js'
import { assessRequest, teachRequest } from './turns.js'

/**
 * Runs a lesson: it grades each answer, applies the lesson rules, and streams the tutor's reply.
 * It is the only place that talks to the server. The components only show what it returns and call what it offers.
 */
export function useLesson(apiKey) {
  const [state, dispatch] = useReducer(chatReducer, initialChat)
  const latest = useRef(state)
  latest.current = state
  const replyController = useRef(null)
  const retryAction = useRef(null)
  const messageCount = useRef(0)
  // Bumped when a lesson starts or ends, so a request that finishes late cannot touch the next lesson.
  const generation = useRef(0)

  const newMessageId = () => {
    messageCount.current += 1
    return `message-${messageCount.current}`
  }

  async function reply({ before, after, move, feedback, chat, replaceId }) {
    const id = replaceId ?? newMessageId()
    const run = generation.current
    const controller = new AbortController()
    replyController.current = controller
    retryAction.current = () => reply({ before, after, move, feedback, chat, replaceId: id })

    dispatch({ type: 'replyStarted', id, sourceIds: stepForMove(before, after, move).sourceIds })
    try {
      await postEvents('/api/teach', {
        apiKey,
        body: teachRequest({ before, after, move, feedback, messages: chat }),
        signal: controller.signal,
        onEvent: (event) => {
          if (event.type === 'text' && run === generation.current) dispatch({ type: 'replyText', id, text: event.text })
        },
      })
      if (run === generation.current) dispatch({ type: 'replyDone', id })
    } catch (error) {
      if (run !== generation.current) return
      dispatch(error.name === 'AbortError' ? { type: 'stopped' } : { type: 'failed', error: describeFailure(error) })
    }
  }

  async function gradeAndReply({ lesson, earlier, studentMessage }) {
    const run = generation.current
    retryAction.current = () => gradeAndReply({ lesson, earlier, studentMessage })
    dispatch({ type: 'grading' })
    try {
      const { verdict, feedback } = await requestAssessment({ apiKey, body: assessRequest(lesson, earlier, studentMessage.content) })
      if (run !== generation.current) return
      const { lesson: after, move } = applyVerdict(lesson, verdict)
      dispatch({ type: 'graded', lesson: after })
      await reply({ before: lesson, after, move, feedback, chat: [...earlier, studentMessage] })
    } catch (error) {
      if (run === generation.current) dispatch({ type: 'failed', error: describeFailure(error) })
    }
  }

  /** Starts a lesson from a plan and has the tutor write its opening message. */
  function begin(plan, passages) {
    generation.current += 1
    const lesson = createLesson(plan, passages)
    dispatch({ type: 'begun', lesson })
    reply({ before: lesson, after: lesson, move: { type: 'introduce' }, chat: [] })
  }

  /** Sends the student's answer. If the tutor's last reply was stopped half-way, the student moves on without it. */
  function send(text) {
    const { lesson, messages, status, replyOwed } = latest.current
    if (!lesson || lesson.finished || (status !== 'idle' && status !== 'stopped')) return
    if (replyOwed) dispatch({ type: 'abandoned' })
    const studentMessage = { id: newMessageId(), role: 'student', content: text }
    dispatch({ type: 'studentSaid', message: studentMessage })
    gradeAndReply({ lesson, earlier: messages, studentMessage })
  }

  const stop = () => replyController.current?.abort()
  const retry = () => retryAction.current?.()

  /** Ends the lesson and goes back to the plan. */
  function leave() {
    generation.current += 1
    replyController.current?.abort()
    dispatch({ type: 'left' })
  }

  const { lesson, status } = state
  return {
    lesson,
    messages: state.messages,
    status,
    error: state.error,
    isActive: lesson !== null,
    canSend: lesson !== null && !lesson.finished && (status === 'idle' || status === 'stopped'),
    begin,
    send,
    stop,
    retry,
    leave,
  }
}
