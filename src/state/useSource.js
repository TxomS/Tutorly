import { useRef, useState } from 'react'
import { MAX_SOURCE_CHARS } from '../../shared/limits.js'
import { FileReadError, readSourceFile } from '../ingest/readFile.js'

const NO_FILE = { status: 'idle' }

/**
 * The material to teach: its text, and the file it came from if there was one.
 * `file.status` is "idle", "reading", "loaded" or "failed"; the other fields describe the file or say what went wrong.
 * It lives in `App`, so the material is still there when the teacher comes back from the plan to change the request.
 */
export function useSource() {
  const [text, setText] = useState('')
  const [file, setFile] = useState(NO_FILE)
  // If the teacher picks another file while one is still being read, only the latest pick counts.
  const latestPick = useRef(0)

  async function pickFile(files) {
    latestPick.current += 1
    const thisPick = latestPick.current
    if (files.length !== 1) {
      setFile({ status: 'failed', message: 'Choose one file at a time.' })
      return
    }

    const [chosen] = files
    setFile({ status: 'reading', name: chosen.name })
    try {
      const { text: fileText, pages } = await readSourceFile(chosen)
      if (thisPick !== latestPick.current) return
      setText(fileText)
      setFile({ status: 'loaded', name: chosen.name, pages })
    } catch (error) {
      if (thisPick !== latestPick.current) return
      // The message is for the teacher; what actually went wrong goes to the console for whoever is debugging.
      if (error.cause) console.error(error.cause)
      setFile({ status: 'failed', name: chosen.name, message: error instanceof FileReadError ? error.message : 'Could not read this file.' })
    }
  }

  /** The teacher typed, pasted or deleted text. Emptying it also forgets the file, so nothing claims text that is no longer there. */
  function edit(newText) {
    setText(newText)
    if (newText.trim() === '') setFile(NO_FILE)
  }

  /** Throws the material away. A file that is still being read is dropped too, so its text does not appear afterwards. */
  function clear() {
    latestPick.current += 1
    setText('')
    setFile(NO_FILE)
  }

  return { text, file, isTooLong: text.length > MAX_SOURCE_CHARS, pickFile, edit, clear }
}
