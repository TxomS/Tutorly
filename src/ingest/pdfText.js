// Turns the pieces of text that pdf.js reads from one PDF page into paragraphs.
// A PDF has no paragraphs, only pieces of text with positions, so the lines and the paragraph breaks are rebuilt from where the pieces sit.

const SAME_LINE = 0.5 // a piece this many text heights above or below the line (or less) is still on that line
const NEW_PARAGRAPH = 1.4 // a gap between lines this many times the usual line spacing starts a new paragraph
const NEW_SIZE = 0.15 // text that is this much taller or shorter than the line before (a heading) starts a new paragraph
const WORD_GAP = 0.25 // a gap this many text heights wide is a space when neither piece has one

// Letters that PDFs often store as presentation forms (Arabic letters shaped for the start, middle or end of a word, and ligatures such as "fi").
const PRESENTATION_FORMS = /[ﬀ-ﬆﭐ-﷿ﹰ-﻿]+/g

const xOf = (piece) => piece.transform[4]
const yOf = (piece) => piece.transform[5]

function groupIntoLines(pieces) {
  const lines = []
  for (const piece of pieces) {
    if (piece.str === '') continue
    const line = lines.at(-1)
    if (line && Math.abs(yOf(piece) - line.y) <= SAME_LINE * Math.max(piece.height, line.height)) {
      line.pieces.push(piece)
      line.height = Math.max(line.height, piece.height)
    } else {
      lines.push({ y: yOf(piece), height: piece.height, pieces: [piece] })
    }
  }
  return lines
}

const isRightToLeft = (pieces) => {
  const withText = pieces.filter(({ str }) => str.trim())
  return withText.filter(({ dir }) => dir === 'rtl').length > withText.length / 2
}

function hasGapBetween(before, after, rightToLeft) {
  if (before.str.endsWith(' ') || after.str.startsWith(' ')) return false
  const gap = rightToLeft ? xOf(before) - (xOf(after) + after.width) : xOf(after) - (xOf(before) + before.width)
  return gap > WORD_GAP * Math.max(before.height, after.height)
}

function textOfLine(pieces) {
  const rightToLeft = isRightToLeft(pieces)
  // Right-to-left text is placed left to right on the page, so reading order is the reverse of position.
  const inReadingOrder = rightToLeft ? [...pieces].sort((a, b) => xOf(b) - xOf(a)) : pieces
  const text = inReadingOrder.reduce((joined, piece, index) => joined + (index > 0 && hasGapBetween(inReadingOrder[index - 1], piece, rightToLeft) ? ' ' : '') + piece.str, '')
  return text
    .replace(PRESENTATION_FORMS, (run) => run.normalize('NFKC'))
    .replace(/\s+/g, ' ')
    .trim()
}

// The smaller gaps are the spacing inside paragraphs, so a low quantile still finds it on a page where many paragraphs are a single line, where the median would give the gap between paragraphs.
function usualSpacing(lines) {
  const gaps = lines
    .slice(1)
    .map((line, index) => lines[index].y - line.y)
    .filter((gap) => gap > 0)
    .sort((a, b) => a - b)
  return gaps[Math.floor((gaps.length - 1) / 4)]
}

/** A word cut by a hyphen at the end of a line is put back together. */
const joinLines = (text, next) => (/\p{L}-$/u.test(text) && /^\p{Ll}/u.test(next) ? text.slice(0, -1) + next : `${text} ${next}`)

const ENDS_SENTENCE = /[.!?؟:;"'”’)\]]$/

/** Puts the pages together. A paragraph that runs over a page break (the page stops mid-sentence and the next starts in lower case) is made one again. */
export function joinPages(pages) {
  const paragraphs = []
  for (const [first, ...rest] of pages) {
    if (first === undefined) continue
    const last = paragraphs.at(-1)
    if (last !== undefined && !ENDS_SENTENCE.test(last) && /^\p{Ll}/u.test(first)) paragraphs[paragraphs.length - 1] = joinLines(last, first)
    else paragraphs.push(first)
    paragraphs.push(...rest)
  }
  return paragraphs
}

/** The paragraphs of one page, as strings. `pieces` is the `items` list from pdf.js's `getTextContent()`. */
export function paragraphsOfPage(pieces) {
  const lines = groupIntoLines(pieces)
    .map((line) => ({ ...line, text: textOfLine(line.pieces) }))
    .filter((line) => line.text)
  const spacing = usualSpacing(lines)

  const paragraphs = []
  lines.forEach((line, index) => {
    const previous = lines[index - 1]
    const startsParagraph =
      !previous ||
      (spacing && previous.y - line.y > spacing * NEW_PARAGRAPH) ||
      Math.abs(previous.height - line.height) > NEW_SIZE * Math.max(previous.height, line.height)
    if (startsParagraph) paragraphs.push(line.text)
    else paragraphs[paragraphs.length - 1] = joinLines(paragraphs.at(-1), line.text)
  })
  return paragraphs
}
