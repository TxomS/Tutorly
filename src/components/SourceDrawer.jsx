import { useEffect, useRef } from 'react'

/** The passages of the source that a tutor message is based on: a panel on the side on a wide screen, a sheet from the bottom on a phone. */
export default function SourceDrawer({ passages, onClose }) {
  const closeButton = useRef(null)

  useEffect(() => {
    closeButton.current.focus()
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-20 flex items-end bg-slate-900/40 md:items-stretch md:justify-end" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Source passages"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[75dvh] w-full flex-col rounded-t-2xl bg-white shadow-xl md:max-h-none md:w-96 md:rounded-none"
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold">Where this comes from</h2>
          <button ref={closeButton} type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm font-medium text-indigo-600 hover:bg-indigo-50">
            Close
          </button>
        </header>
        <div className="flex flex-col gap-4 overflow-y-auto p-4">
          {passages.map((passage) => (
            <article key={passage.id}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Passage {passage.id}</h3>
              <p dir="auto" className="mt-1 whitespace-pre-wrap text-sm">
                {passage.text}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
