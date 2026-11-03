import { useState } from 'react'
import { ACCEPTED_FILES } from '../ingest/readFile.js'

/** Where the teacher chooses or drops a file. It only reports the files; reading them and showing the result belong to the screen. */
export default function FilePicker({ onFiles, disabled, inputRef }) {
  const [isDragging, setIsDragging] = useState(false)

  function drop(event) {
    event.preventDefault()
    setIsDragging(false)
    if (!disabled) onFiles([...event.dataTransfer.files])
  }

  return (
    <label
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={drop}
      className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed px-4 py-5 text-center focus-within:ring-2 focus-within:ring-indigo-500 ${
        isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-white'
      } ${disabled ? 'opacity-60' : ''}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FILES}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          onFiles([...event.target.files])
          // Without this, choosing the same file again would not count as a change.
          event.target.value = ''
        }}
      />
      <span className="text-sm">
        <span className="font-medium text-indigo-600">Choose a file</span> or drop it here
      </span>
      <span className="text-xs text-slate-500">.txt, .md, .pdf or .docx, up to 10 MB</span>
    </label>
  )
}
