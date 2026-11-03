import assert from 'node:assert/strict'
import { test } from 'node:test'
import { joinPages, paragraphsOfPage } from './pdfText.js'

// A piece of text as pdf.js reports it: its position is in `transform` (x at 4, y at 5), and y grows upwards.
const piece = (str, x, y, { height = 12, width = str.length * 6, dir = 'ltr' } = {}) => ({ str, transform: [height, 0, 0, height, x, y], width, height, dir })
const line = (str, y, options) => piece(str, 28, y, options)

test('lines of one paragraph are joined, and a bigger gap starts a new paragraph', () => {
  const paragraphs = paragraphsOfPage([line('First line of one', 700), line('and the second line.', 680), line('Next paragraph here', 640), line('and its end.', 620)])

  assert.deepEqual(paragraphs, ['First line of one and the second line.', 'Next paragraph here and its end.'])
})

test('a heading in bigger text is its own paragraph even when the gap is the same', () => {
  const paragraphs = paragraphsOfPage([line('Where it happens', 700, { height: 16 }), line('Photosynthesis takes place', 680), line('mostly in the leaves.', 660)])

  assert.deepEqual(paragraphs, ['Where it happens', 'Photosynthesis takes place mostly in the leaves.'])
})

test('single-line paragraphs next to a longer one are kept apart', () => {
  const paragraphs = paragraphsOfPage([line('A paragraph', 700), line('of two lines.', 680), line('Short one.', 640), line('Another.', 600)])

  assert.deepEqual(paragraphs, ['A paragraph of two lines.', 'Short one.', 'Another.'])
})

test('pieces on one line get a space only where there is a gap, and a small raised piece stays on the line', () => {
  assert.deepEqual(paragraphsOfPage([piece('Hello', 0, 100, { width: 30 }), piece('world', 40, 100, { width: 30 })]), ['Hello world'])
  assert.deepEqual(paragraphsOfPage([piece('Hel', 0, 100, { width: 18 }), piece('lo', 18, 100, { width: 12 })]), ['Hello'])
  assert.deepEqual(paragraphsOfPage([piece('6CO', 0, 100, { width: 18 }), piece('2', 18, 98, { height: 8, width: 4 })]), ['6CO2'])
})

test('a word cut by a hyphen at the end of a line is put back together, but a real dash is kept', () => {
  assert.deepEqual(paragraphsOfPage([line('Chlorophyll absorbs light in the photo-', 700), line('synthesis process.', 680)]), ['Chlorophyll absorbs light in the photosynthesis process.'])
  assert.deepEqual(paragraphsOfPage([line('This is a well-', 700), line('Known fact.', 680)]), ['This is a well- Known fact.'])
})

test('pieces that carry no text are ignored', () => {
  assert.deepEqual(paragraphsOfPage([line('', 700), line('Text.', 700), piece('', 28, 660, { height: 0 })]), ['Text.'])
})

test('ligatures from the PDF become normal letters', () => {
  assert.deepEqual(paragraphsOfPage([line('the ﬁrst ﬂower', 700)]), ['the first flower'])
})

test('right-to-left text is put back in reading order and its letter forms are made normal', () => {
  // On the page the pieces run left to right, so the first one read is the right-most.
  const pieces = [piece('ﺑ', 20, 700, { dir: 'rtl', width: 8 }), piece('ﺃ', 30, 700, { dir: 'rtl', width: 8 })]

  assert.deepEqual(paragraphsOfPage(pieces), ['أب'])
})

test('a paragraph that runs over a page break is made one again, but a finished one is not', () => {
  assert.deepEqual(joinPages([['Intro.', 'The energy captured in'], ['the first stage is used.', 'Next.']]), ['Intro.', 'The energy captured in the first stage is used.', 'Next.'])
  assert.deepEqual(joinPages([['One sentence.'], ['Another sentence.']]), ['One sentence.', 'Another sentence.'])
  assert.deepEqual(joinPages([['A heading'], ['Starts a new part.']]), ['A heading', 'Starts a new part.'])
  assert.deepEqual(joinPages([['Only page.'], [], ['Last.']]), ['Only page.', 'Last.'])
})
