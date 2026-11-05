// What the lesson screen shows: the lesson rules' state, the chat, and where a student's turn has got to.
// status: "idle" (waiting for the student), "grading", "replying" (the tutor is writing), "stopped" (the student pressed Stop) or "failed".

export const initialChat = { lesson: null, messages: [], status: 'idle', error: '', replyOwed: false }

const withMessage = (messages, id, change) => messages.map((message) => (message.id === id ? { ...message, ...change } : message))

// A reply that stopped or failed before its first word leaves nothing worth keeping. Hiding that empty message is not enough:
// it would still be sent with the next request, and the server rejects an empty message as an invalid conversation.
const withoutEmptyReply = (messages) => messages.filter((message) => message.role !== 'tutor' || message.content !== '')

export function chatReducer(state, action) {
  switch (action.type) {
    case 'begun':
      return { ...initialChat, lesson: action.lesson }
    case 'left':
      return initialChat
    case 'studentSaid':
      return { ...state, messages: [...state.messages, action.message] }
    case 'grading':
      return { ...state, status: 'grading', error: '' }
    case 'lessonChanged':
      // The progress bar moves as soon as an answer is graded (or the match-up game is over), before the tutor has finished writing its reply.
      return { ...state, lesson: action.lesson }
    case 'replyStarted': {
      const message = { id: action.id, role: 'tutor', content: '', sourceIds: action.sourceIds, complete: false }
      const exists = state.messages.some(({ id }) => id === action.id)
      return {
        ...state,
        status: 'replying',
        error: '',
        replyOwed: true,
        messages: exists ? state.messages.map((existing) => (existing.id === action.id ? message : existing)) : [...state.messages, message],
      }
    }
    case 'replyText':
      return { ...state, messages: state.messages.map((message) => (message.id === action.id ? { ...message, content: message.content + action.text } : message)) }
    case 'replyDone':
      return { ...state, status: 'idle', replyOwed: false, messages: withMessage(state.messages, action.id, { complete: true }) }
    case 'stopped':
      return { ...state, status: 'stopped', messages: withoutEmptyReply(state.messages) }
    case 'failed':
      return { ...state, status: 'failed', error: action.error, messages: withoutEmptyReply(state.messages) }
    case 'abandoned':
      // The student answered instead of continuing: the half-written reply stays as it is.
      return {
        ...state,
        status: 'idle',
        replyOwed: false,
        messages: state.messages.map((message) => (message.complete === false ? { ...message, complete: true, interrupted: true } : message)),
      }
    default:
      return state
  }
}
