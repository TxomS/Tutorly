import { useCallback, useState } from 'react'
import { passagesWithIds, progressOf, starsOf } from '../lesson/lesson.js'
import ApiKeyField from './ApiKeyField.jsx'
import Composer from './Composer.jsx'
import FinishedCard from './FinishedCard.jsx'
import MessageList from './MessageList.jsx'
import ProgressBar from './ProgressBar.jsx'
import SourceDrawer from './SourceDrawer.jsx'
import StatusNotice from './StatusNotice.jsx'
import StepCelebration from './StepCelebration.jsx'

/** The lesson itself: progress at the top, the chat in the middle, where the student answers at the bottom. */
export default function LessonScreen({ session, apiKey, onApiKeyChange }) {
  const [shownSourceIds, setShownSourceIds] = useState(null)
  const closeSource = useCallback(() => setShownSourceIds(null), [])
  const { lesson, messages, status, error, canSend } = session
  const progress = progressOf(lesson)
  const stars = starsOf(lesson)

  return (
    <div className="mx-auto flex h-dvh max-w-2xl flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Tutorly</p>
            <h1 dir="auto" className="truncate font-semibold">
              {lesson.plan.title}
            </h1>
          </div>
          <button type="button" onClick={session.leave} className="shrink-0 rounded-lg border border-slate-300 px-3 py-1 text-sm">
            End lesson
          </button>
        </div>
        <div className="mt-2">
          <ProgressBar {...progress} stars={stars.earned} />
        </div>
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-slate-500">API key</summary>
          <div className="mt-2">
            <ApiKeyField value={apiKey} onChange={onApiKeyChange} />
          </div>
        </details>
      </header>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <MessageList messages={messages} onShowSource={(message) => setShownSourceIds(message.sourceIds)}>
          <StatusNotice status={status} error={error} canAnswer={canSend} onRetry={session.retry} />
        </MessageList>
        <StepCelebration outcomes={lesson.outcomes} />
      </div>
      {lesson.finished && status === 'idle' ? (
        <FinishedCard steps={lesson.plan.steps} outcomes={lesson.outcomes} stars={stars} onLeave={session.leave} />
      ) : (
        <Composer canSend={canSend} isReplying={status === 'replying'} onSend={session.send} onStop={session.stop} />
      )}
      {shownSourceIds && <SourceDrawer passages={passagesWithIds(lesson, shownSourceIds)} onClose={closeSource} />}
    </div>
  )
}
