import { MAX_SOURCE_CHARS } from '../../shared/limits.js'

// Files are read in the browser and only their text goes to the server, so the server stays stateless and never sees the file itself.
export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const ACCEPTED_FILES = [
  '.txt,.md,.markdown,.pdf,.docx',
  'text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
].join(',')

const KIND_BY_EXTENSION = { txt: 'text', md: 'text', markdown: 'text', pdf: 'pdf', docx: 'docx' }
const KIND_BY_TYPE = {
  'text/plain': 'text',
  'text/markdown': 'text',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
}
const KIND_NAMES = { text: 'text file', pdf: 'PDF', docx: 'Word file' }

/** An error whose message is written for the person who picked the file. */
export class FileReadError extends Error {
  constructor(message, options) {
    super(message, options)
    this.name = 'FileReadError'
  }
}

/** "text", "pdf" or "docx", or undefined for a file Tutorly cannot read. The extension decides; the type is the fallback. */
export function kindOfFile({ name, type }) {
  const extension = name.includes('.') ? name.split('.').pop().toLowerCase() : ''
  return KIND_BY_EXTENSION[extension] ?? KIND_BY_TYPE[type]
}

const unsupported = (name) =>
  /\.doc$/i.test(name)
    ? 'Old Word files (.doc) cannot be read. Save it as .docx and try again.'
    : `Tutorly can read .txt, .md, .pdf and .docx files, but not "${name}".`

const tooLong = () =>
  new FileReadError(`This file is too long. Tutorly can teach from up to ${MAX_SOURCE_CHARS.toLocaleString('en-US')} characters (roughly 150 pages) at once. Try a shorter part of it.`)

const noText = (kind) =>
  new FileReadError(
    kind === 'pdf'
      ? 'This PDF has no text Tutorly can read. It may be a scan or a set of pictures. Use a PDF with selectable text, or paste the text instead.'
      : 'This file has no text in it.',
  )

/** What to tell the user when a file could not be opened at all. */
export const explainReadError = (error, kind) =>
  error?.name === 'PasswordException'
    ? 'This PDF is password-protected. Remove the password and try again.'
    : `Could not read this ${KIND_NAMES[kind]}. It may be damaged, or saved in a different format.`

const megabytes = (bytes) => (bytes / 1024 / 1024).toFixed(1)

const cleanText = (text) =>
  text
    .replace(/^﻿/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

// A binary file renamed to .txt decodes to a lot of replacement characters.
const looksBinary = (text) => text.includes('\0') || (text.match(/�/g)?.length ?? 0) > text.length * 0.01

async function readTextFile(file) {
  const text = await file.text()
  if (looksBinary(text)) throw new FileReadError('This does not look like a text file.')
  return { text }
}

async function readPdfFile(file) {
  // The PDF and Word readers are large, so they are only downloaded when someone picks such a file.
  const { readPdf } = await import('./pdf.js')
  const { paragraphs, pageCount, truncated } = await readPdf(file, { maxChars: MAX_SOURCE_CHARS })
  if (truncated) throw tooLong()
  return { text: paragraphs.join('\n\n'), pages: pageCount }
}

async function readWordFile(file) {
  const { readDocx } = await import('./docx.js')
  return { text: await readDocx(file) }
}

const READERS = { text: readTextFile, pdf: readPdfFile, docx: readWordFile }

/**
 * Reads a file the teacher picked and returns { text, pages? }.
 * Every way it can fail throws a FileReadError whose message says what to do about it.
 */
export async function readSourceFile(file) {
  const kind = kindOfFile(file)
  if (!kind) throw new FileReadError(unsupported(file.name))
  if (file.size === 0) throw new FileReadError('This file is empty.')
  if (file.size > MAX_FILE_BYTES) {
    throw new FileReadError(`This file is ${megabytes(file.size)} MB. The limit is ${MAX_FILE_BYTES / 1024 / 1024} MB.`)
  }

  let read
  try {
    read = await READERS[kind](file)
  } catch (error) {
    throw error instanceof FileReadError ? error : new FileReadError(explainReadError(error, kind), { cause: error })
  }

  const text = cleanText(read.text)
  if (!text) throw noText(kind)
  if (text.length > MAX_SOURCE_CHARS) throw tooLong()
  return { text, pages: read.pages }
}
