import { useCallback, useState } from 'react'
import { isReviewing, passagesWithIds, progressOf, starsOf } from '../lesson/lesson.js'
import ApiKeyField from './ApiKeyField.jsx'
import Composer from './Composer.jsx'
import FinishedCard from './FinishedCard.jsx'
import MatchUp from './MatchUp.jsx'
import MessageList from './MessageList.jsx'
import ProgressBar from './ProgressBar.jsx'
import SourceDrawer from './SourceDrawer.jsx'
import StatusNotice from './StatusNotice.jsx'
import StepCelebration from './StepCelebration.jsx'

/**
 * The lesson itself: progress at the top, the chat in the middle, where the student answers at the bottom.
 * While the match-up game is on, a wide screen splits in two (the chat on the left, the game on the right) and goes back to one column when the game is over.
 * A small screen cannot hold both, so there the game takes the whole screen and the student can switch to the chat and back.
 */
export default function LessonScreen({ session, apiKey, onApiKeyChange }) {
  const [shownSourceIds, setShownSourceIds] = useState(null)
  const [peekingAtChat, setPeekingAtChat] = useState(false)
  const closeSource = useCallback(() => setShownSourceIds(null), [])
  const { lesson, messages, status, error, canSend } = session
  const progress = progressOf(lesson)
  const stars = starsOf(lesson)
  const showFinishedCard = lesson.finished && status === 'idle'
  // The lesson is paused for the match-up game. The game shows once the tutor has finished (or stopped) writing the message that announces it.
  const pausedForGame = isReviewing(lesson)
  const gameReady = pausedForGame && (status === 'idle' || status === 'stopped')

  function continueLesson() {
    setPeekingAtChat(false)
    session.finishMatchUp()
  }

  return (
    // Only while the game is ready does the page get wide enough for two columns, and it slides back to one column afterwards.
    <div className={`mx-auto flex h-dvh max-w-2xl flex-col bg-slate-50 transition-[max-width] duration-300 motion-reduce:transition-none ${gameReady ? 'lg:max-w-6xl' : ''}`}>
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
          <ProgressBar {...progress} review={lesson.review} stars={stars.earned} />
        </div>
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-slate-500">API key</summary>
          <div className="mt-2">
            <ApiKeyField value={apiKey} onChange={onApiKeyChange} />
          </div>
        </details>
      </header>
      <div className="relative flex min-h-0 flex-1">
        {/* The chat column. On a small screen it is out of sight while the game is on, unless the student asks to look at it. */}
        <div className={`flex min-w-0 flex-1 flex-col ${gameReady && !peekingAtChat ? 'max-lg:hidden' : ''}`}>
          <MessageList messages={messages} onShowSource={(message) => setShownSourceIds(message.sourceIds)}>
            <StatusNotice status={status} error={error} canAnswer={canSend} onRetry={session.retry} />
          </MessageList>
          {showFinishedCard ? (
            <FinishedCard steps={lesson.plan.steps} outcomes={lesson.outcomes} stars={stars} onLeave={session.leave} />
          ) : (
            <>
              {/* Beside the game the answer box stays, switched off. On a small screen it makes way for the way back to the game. */}
              <div className={gameReady ? 'max-lg:hidden' : ''}>
                <Composer
                  canSend={canSend}
                  isReplying={status === 'replying'}
                  idleHint={pausedForGame ? 'Finish the match-up first' : undefined}
                  onSend={session.send}
                  onStop={session.stop}
                />
              </div>
              {gameReady && peekingAtChat && (
                <div className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
                  <button type="button" onClick={() => setPeekingAtChat(false)} className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white">
                    Back to the match-up
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        {pausedForGame && (
          <MatchUp
            review={lesson.review}
            nextStep={lesson.stepIndex + 2}
            hidden={!gameReady}
            hiddenOnSmallScreen={peekingAtChat}
            onShowChat={() => setPeekingAtChat(true)}
            onContinue={continueLesson}
          />
        )}
        {/* Centred over the chat: over the left half while the screen is split. */}
        <StepCelebration outcomes={lesson.outcomes} className={gameReady ? 'lg:end-1/2' : ''} />
      </div>
      {shownSourceIds && <SourceDrawer passages={passagesWithIds(lesson, shownSourceIds)} onClose={closeSource} />}
    </div>
  )
}
