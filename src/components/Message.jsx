import Markdown from './Markdown.jsx'

export default function Message({ message, onShowSource }) {
  const isTutor = message.role === 'tutor'
  const hasText = message.content !== ''

  return (
    <div className={`flex ${isTutor ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[88%] rounded-2xl px-4 py-2 ${isTutor ? 'rounded-ss-sm bg-white ring-1 ring-slate-200' : 'rounded-se-sm bg-indigo-600 text-white'}`}>
        {!isTutor && (
          <p dir="auto" className="whitespace-pre-wrap">
            {message.content}
          </p>
        )}
        {isTutor && (hasText ? <Markdown>{message.content}</Markdown> : <p className="text-slate-400">…</p>)}
        {message.interrupted && <p className="mt-1 text-xs italic text-slate-500">Stopped</p>}
        {isTutor && hasText && message.sourceIds.length > 0 && (
          <button type="button" onClick={() => onShowSource(message)} className="mt-1 text-xs font-medium text-indigo-600 hover:underline">
            View source
          </button>
        )}
      </div>
    </div>
  )
}
