const MIN_CHARS = 300
const MAX_CHARS = 1200

// Splits at sentence ends, including Arabic and Chinese punctuation.
const SENTENCE_END = /(?<=[.!?؟。])\s+/

function splitLongParagraph(paragraph) {
  if (paragraph.length <= MAX_CHARS) return [paragraph]

  const pieces = []
  let current = ''
  for (const sentence of paragraph.split(SENTENCE_END)) {
    if (current && current.length + sentence.length + 1 > MAX_CHARS) {
      pieces.push(current)
      current = ''
    }
    current = current ? `${current} ${sentence}` : sentence
    while (current.length > MAX_CHARS) {
      pieces.push(current.slice(0, MAX_CHARS))
      current = current.slice(MAX_CHARS)
    }
  }
  if (current) pieces.push(current)
  return pieces
}

/**
 * Cuts plain text into passages of roughly paragraph size, each with an id the lesson plan can cite.
 * Returns [{ id: "p1", text }, ...].
 */
export function splitIntoPassages(text) {
  const pieces = text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .flatMap(splitLongParagraph)

  const passages = []
  let current = ''
  for (const piece of pieces) {
    if (current && current.length + piece.length + 2 > MAX_CHARS) {
      passages.push(current)
      current = ''
    }
    current = current ? `${current}\n\n${piece}` : piece
    if (current.length >= MIN_CHARS) {
      passages.push(current)
      current = ''
    }
  }
  if (current) passages.push(current)

  return passages.map((passage, index) => ({ id: `p${index + 1}`, text: passage }))
}
