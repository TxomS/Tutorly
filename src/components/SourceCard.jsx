import { MAX_SOURCE_CHARS } from '../../shared/limits.js'

const PREVIEW_CHARS = 300

/** What the lesson will be taught from: the file (or pasted text), how big it is, a preview of its start, and the two things to do with it. */
export default function SourceCard({ file, text, isTooLong, onEdit, onRemove }) {
  const isFile = file.status === 'loaded'
  const name = isFile ? file.name : 'Pasted text'
  const size = [isFile && file.pages && `${file.pages} ${file.pages === 1 ? 'page' : 'pages'}`, `${text.length.toLocaleString('en-US')} characters`].filter(Boolean).join(', ')

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-300 bg-white p-3">
      <p className="text-sm">
        <span dir="auto" className="break-words font-medium">
          {name}
        </span>
        <span className="text-slate-500"> ({size})</span>
      </p>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</p>
        {/* The padding is on the outer box: on the clamped paragraph itself, the next line would show through it. */}
        <div className="mt-1 rounded-md border-s-4 border-indigo-300 bg-slate-50 px-3 py-2">
          <p dir="auto" className="line-clamp-3 break-words text-sm text-slate-700">
            {text.trim().slice(0, PREVIEW_CHARS)}
          </p>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {isFile ? 'This is only the start. Open the material to read all of it and fix anything that was read wrongly.' : 'This is only the start of the text.'}
        </p>
      </div>
      {isTooLong && (
        <p className="text-sm text-red-700">
          This is longer than the {MAX_SOURCE_CHARS.toLocaleString('en-US')} characters Tutorly can teach from at once. Open it and cut it down.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onEdit} className="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100">
          Edit the material
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${isFile ? file.name : 'the pasted text'}`}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
        >
          <span aria-hidden="true">×</span> Remove
        </button>
      </div>
    </div>
  )
}
