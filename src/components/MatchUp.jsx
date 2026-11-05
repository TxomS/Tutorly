import { useEffect, useRef, useState } from 'react'
import { layoutFor } from '../lesson/review.js'
import Confetti from './Confetti.jsx'

const START_NOTE = 'Tap a word, then the meaning that goes with it.'

function CheckIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  )
}

const STATE_STYLE = {
  idle: 'border-slate-200 bg-white hover:border-indigo-300',
  picked: 'border-indigo-500 bg-indigo-50',
  matched: 'border-emerald-300 bg-emerald-50 text-emerald-900',
}

/**
 * One card: a word or a meaning. It is a real button, so it works by keyboard and by touch. A wrong match flashes red (and shakes,
 * unless the person asked for less motion). The key on the inner part restarts that animation without moving keyboard focus.
 */
function Card({ side, text, state, missCount, onChoose }) {
  const matched = state === 'matched'
  return (
    <button
      type="button"
      onClick={onChoose}
      disabled={matched}
      aria-pressed={matched ? undefined : state === 'picked'}
      className={`block w-full rounded-xl border-2 text-start text-sm leading-snug sm:text-base transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${STATE_STYLE[state]}`}
    >
      <span
        key={missCount}
        className={`flex min-h-12 items-center gap-2 rounded-[10px] px-3 py-2 sm:min-h-14 ${missCount ? 'motion-reduce:animate-miss motion-safe:animate-miss-shake' : ''} ${matched ? 'motion-safe:animate-match' : ''}`}
      >
        <span dir="auto" className={`min-w-0 flex-1 break-words ${side === 'word' ? 'font-semibold' : ''}`}>
          {text}
        </span>
        {matched && <CheckIcon className="h-4 w-4 shrink-0 text-emerald-600" />}
        {matched && <span className="sr-only">(matched)</span>}
      </span>
    </button>
  )
}

/**
 * The match-up game that pauses the lesson: tap a word, then its meaning. Only the steps already taught are in it (the lesson rules choose the pairs).
 * Nothing is lost for a wrong match, so there is no wrong way to play. It does not change the stars.
 * The student can leave at any time with "Skip the game", so a game they dislike can never trap them.
 * When `hidden` (the tutor is still writing) it stays mounted, so the game is not lost if the tutor's message is continued.
 * It is a column of its own: the right half of a wide screen (the chat is the left half), or the whole area under the header on a small screen,
 * where `hiddenOnSmallScreen` hands the screen back to the chat and "Back to chat" asks for it.
 */
export default function MatchUp({ review, nextStep, hidden, hiddenOnSmallScreen, onShowChat, onContinue }) {
  const [layout] = useState(() => layoutFor(review.pairs))
  const [matched, setMatched] = useState([])
  const [picked, setPicked] = useState(null)
  const [miss, setMiss] = useState(null)
  const [mistakes, setMistakes] = useState(0)
  const [note, setNote] = useState(START_NOTE)
  const continueButton = useRef(null)
  const total = review.pairs.length
  const done = matched.length === total

  // When the last pair is matched, "Continue" is where the keyboard goes, and it is scrolled into view on a small screen.
  useEffect(() => {
    if (done) continueButton.current?.focus()
  }, [done])

  function choose(side, id) {
    if (matched.includes(id)) return
    if (!picked || picked.side === side) {
      const sameAgain = picked?.side === side && picked.id === id
      setPicked(sameAgain ? null : { side, id })
      setMiss(null)
      setNote(sameAgain ? START_NOTE : side === 'word' ? 'Now pick the meaning that goes with it.' : 'Now pick the word that goes with it.')
      return
    }

    const wordId = side === 'word' ? id : picked.id
    const meaningId = side === 'meaning' ? id : picked.id
    setPicked(null)
    if (wordId === meaningId) {
      const next = [...matched, id]
      setMatched(next)
      setMiss(null)
      setNote(next.length === total ? (mistakes === 0 ? 'All matched, with no mix-ups!' : 'All matched!') : `Matched! ${next.length} of ${total}.`)
    } else {
      setMiss({ wordId, meaningId, count: mistakes + 1 })
      setMistakes(mistakes + 1)
      setNote('Not quite. Try another one.')
    }
  }

  const stateOf = (side, id) => (matched.includes(id) ? 'matched' : picked?.side === side && picked.id === id ? 'picked' : 'idle')
  const missCountOf = (side, id) => (miss && (side === 'word' ? miss.wordId : miss.meaningId) === id ? miss.count : 0)
  const stepsLabel = review.after === 1 ? 'step 1' : `steps 1–${review.after}`

  return (
    <section
      hidden={hidden}
      aria-label="Match-up game"
      className={`relative flex min-h-0 flex-col overflow-y-auto bg-white px-4 pt-3 max-lg:flex-1 lg:w-1/2 lg:flex-none lg:border-s lg:border-slate-200 lg:px-6 lg:pt-5 ${hiddenOnSmallScreen ? 'max-lg:hidden' : ''}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold sm:text-lg">Quick match-up · {stepsLabel}</h2>
        <p className="shrink-0 text-sm font-semibold tabular-nums text-emerald-700">
          {matched.length} of {total}
        </p>
      </div>
      <p role="status" className={`mt-1 text-sm ${miss ? 'text-red-700' : 'text-slate-600'}`}>
        {note}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3 pb-3">
        {[
          { side: 'word', title: 'Words', pairs: layout.words, text: (pair) => pair.term },
          { side: 'meaning', title: 'Meanings', pairs: layout.meanings, text: (pair) => pair.meaning },
        ].map(({ side, title, pairs, text }) => (
          <div key={side}>
            <h3 id={`matchup-${side}`} className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              {title}
            </h3>
            <ul aria-labelledby={`matchup-${side}`} className="flex flex-col gap-2">
              {pairs.map((pair) => (
                <li key={pair.id}>
                  <Card side={side} text={text(pair)} state={stateOf(side, pair.id)} missCount={missCountOf(side, pair.id)} onChoose={() => choose(side, pair.id)} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 -mx-4 mt-auto flex items-center justify-between gap-3 border-t border-slate-100 bg-white px-4 py-3 lg:-mx-6 lg:px-6">
        <button type="button" onClick={onShowChat} className="rounded-lg px-3 py-2 text-sm text-indigo-600 underline lg:hidden">
          Back to chat
        </button>
        <div className="ms-auto">
          {done ? (
            <button ref={continueButton} type="button" onClick={onContinue} className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white">
              Continue to step {nextStep}
            </button>
          ) : (
            <button type="button" onClick={onContinue} className="rounded-lg px-3 py-2 text-sm text-slate-600 underline hover:text-slate-900">
              Skip the game
            </button>
          )}
        </div>
      </div>
      {done && <Confetti spread={1.6} />}
    </section>
  )
}
