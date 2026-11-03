import { useEffect, useRef, useState } from 'react'
import FilePicker from './FilePicker.jsx'
import FileReadStatus from './FileReadStatus.jsx'
import SourceCard from './SourceCard.jsx'
import SourceEditor from './SourceEditor.jsx'

/**
 * "The material to teach". With no material it offers a file to choose (or a popup to paste text into).
 * With material it shows what was loaded, with buttons to edit it in a popup or remove it.
 */
export default function MaterialSection({ source }) {
  const { text, file } = source
  // Which popup is open: null, "paste" (there was no material) or "edit".
  const [editor, setEditor] = useState(null)
  const pickerInput = useRef(null)
  const hasMaterial = text.trim() !== ''
  const hadMaterial = useRef(hasMaterial)

  // When the material is taken away, focus goes to the file picker, because the button that was pressed has gone with it.
  useEffect(() => {
    if (hadMaterial.current && !hasMaterial) pickerInput.current?.focus()
    hadMaterial.current = hasMaterial
  }, [hasMaterial])

  const isReading = file.status === 'reading'

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">The material to teach</span>
      {hasMaterial ? (
        <SourceCard file={file} text={text} isTooLong={source.isTooLong} onEdit={() => setEditor('edit')} onRemove={source.clear} />
      ) : (
        <>
          <FilePicker onFiles={source.pickFile} disabled={isReading} inputRef={pickerInput} />
          <FileReadStatus file={file} />
          <button
            type="button"
            disabled={isReading}
            onClick={() => setEditor('paste')}
            className="self-start text-sm font-medium text-indigo-600 underline disabled:opacity-50"
          >
            Or paste the text instead
          </button>
        </>
      )}
      {editor && (
        <SourceEditor
          mode={editor}
          fileName={file.status === 'loaded' ? file.name : ''}
          text={text}
          isTooLong={source.isTooLong}
          onChange={source.edit}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  )
}
