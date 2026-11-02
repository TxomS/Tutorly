import { useEffect, useRef } from 'react'
import Message from './Message.jsx'

// How close to the bottom (in pixels) the student must be for new text to keep scrolling into view.
const STICK_TO_BOTTOM_WITHIN = 120

/** The chat. It follows new text down, unless the student has scrolled up to read something. */
export default function MessageList({ messages, onShowSource, children }) {
  const scroller = useRef(null)
  const followsBottom = useRef(true)

  useEffect(() => {
    const element = scroller.current
    if (followsBottom.current) element.scrollTop = element.scrollHeight
  })

  function handleScroll() {
    const element = scroller.current
    followsBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < STICK_TO_BOTTOM_WITHIN
  }

  return (
    <div ref={scroller} onScroll={handleScroll} role="log" aria-live="polite" className="flex-1 overflow-y-auto px-4 py-4">
      <div className="flex flex-col gap-3">
        {messages.map((message) => (
          <Message key={message.id} message={message} onShowSource={onShowSource} />
        ))}
        {children}
      </div>
    </div>
  )
}
