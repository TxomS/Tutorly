import { useEffect, useRef } from 'react'
import { MAX_SOURCE_CHARS } from '../../shared/limits.js'

const TITLES = { paste: 'Paste the material', edit: 'Edit the material' }

/**
 * The material as text, in a large popup over a blurred page. The text sits on a centered white "page" so that lines stay
 * a readable length on a wide screen. Every change is kept as it is typed, so closing the popup in any way (Done or Escape) loses nothing.
 */
export default function SourceEditor({ mode, fileName, text, isTooLong, onChange, onClose }) {
  const dialog = useRef(null)
  const textarea = useRef(null)

  useEffect(() => {
    // The browser's own modal dialog keeps focus inside it, makes the page behind it inert, and closes on Escape.
    if (!dialog.current.open) dialog.current.showModal()
    // The caret would start at the end of a long text, which opens the editor scrolled to the bottom.
    textarea.current.focus({ preventScroll: true })
    textarea.current.setSelectionRange(0, 0)
    textarea.current.scrollTop = 0
  }, [])

  return (
    <dialog
      ref={dialog}
      aria-labelledby="source-editor-title"
      onClose={onClose}
      className="m-auto h-[calc(100dvh-1.5rem)] w-[min(64rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-xl bg-white p-0 shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm open:flex sm:h-[calc(100dvh-4rem)]"
    >
      <header className="border-b border-slate-200 px-5 py-4">
        <h2 id="source-editor-title" className="text-lg font-semibold">
          {TITLES[mode]}
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">
          {fileName ? (
            <>
              <span dir="auto" className="font-medium text-slate-700">
                {fileName}
              </span>
              . Delete or fix anything that was read wrongly, such as page numbers or headers.
            </>
          ) : (
            'Paste or type the text Tutorly should teach from.'
          )}
        </p>
      </header>
      <div className="min-h-0 flex-1 bg-slate-100 p-2 sm:p-5">
        <textarea
          ref={textarea}
          value={text}
          onChange={(event) => onChange(event.target.value)}
          aria-label="The material to teach"
          placeholder="Paste the material to teach."
          dir="auto"
          className="mx-auto block h-full w-full max-w-3xl resize-none rounded-lg border border-slate-200 bg-white px-4 py-3 text-base leading-7 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:px-8 sm:py-6"
        />
      </div>
      <footer className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-3">
        <div className="min-w-0 text-sm">
          <p className={`tabular-nums ${isTooLong ? 'font-medium text-red-700' : 'text-slate-600'}`}>
            {text.length.toLocaleString('en-US')} of {MAX_SOURCE_CHARS.toLocaleString('en-US')} characters
            {isTooLong && '. Too long: cut it down to continue.'}
          </p>
          <p className="text-xs text-slate-500">Your changes are kept as you type.</p>
        </div>
        <button type="button" onClick={() => dialog.current.close()} className="shrink-0 rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white hover:bg-indigo-700">
          Done
        </button>
      </footer>
    </dialog>
  )
}
