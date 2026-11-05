import { useState } from 'react'

const MAX_ANSWER_CHARS = 2000

/** Where the student types. One submit button is both "Send" and "Stop": the form handler decides, so a click can never do both. */
export default function Composer({ canSend, isReplying, idleHint = 'Please wait…', onSend, onStop }) {
  const [text, setText] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    if (isReplying) {
      onStop()
      return
    }
    const answer = text.trim()
    if (!answer) return
    onSend(answer)
    setText('')
  }

  function handleKeyDown(event) {
    // Enter sends, Shift+Enter starts a new line, and Enter while an input method is composing text (for example Japanese) does neither.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      event.currentTarget.form.requestSubmit()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-slate-200 bg-white px-4 py-3">
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={!canSend}
        maxLength={MAX_ANSWER_CHARS}
        rows={2}
        dir="auto"
        aria-label="Your answer"
        placeholder={canSend ? 'Type your answer…' : isReplying ? 'The tutor is writing…' : idleHint}
        className="min-h-12 flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
      />
      <button
        type="submit"
        disabled={!isReplying && (!canSend || !text.trim())}
        className={`rounded-lg px-4 py-2 font-medium text-white disabled:opacity-50 ${isReplying ? 'bg-slate-700' : 'bg-indigo-600'}`}
      >
        {isReplying ? 'Stop' : 'Send'}
      </button>
    </form>
  )
}
