import mammoth from 'mammoth'

/** The text of a Word (.docx) file, with a blank line between paragraphs. */
export async function readDocx(file) {
  const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
  return value
}
