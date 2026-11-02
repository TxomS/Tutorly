import assert from 'node:assert/strict'
import { test } from 'node:test'
import { splitIntoPassages } from './passages.js'

const MAX_CHARS = 1200
const sentences = (count) => Array.from({ length: count }, (_, i) => `This is sentence number ${i + 1}.`).join(' ')

test('empty or blank text gives no passages', () => {
  assert.deepEqual(splitIntoPassages(''), [])
  assert.deepEqual(splitIntoPassages('  \n\n  \r\n '), [])
})

test('a short text becomes one passage with id p1', () => {
  assert.deepEqual(splitIntoPassages('Plants make food.'), [{ id: 'p1', text: 'Plants make food.' }])
})

test('short paragraphs are merged until a passage is big enough', () => {
  const paragraph = 'x'.repeat(120)
  const passages = splitIntoPassages([paragraph, paragraph, paragraph, paragraph].join('\n\n'))

  assert.equal(passages.length, 2)
  assert.equal(passages[0].text, [paragraph, paragraph, paragraph].join('\n\n'))
  assert.equal(passages[1].text, paragraph)
})

test('a long paragraph is cut at sentence ends without losing text', () => {
  const paragraph = sentences(120)
  const passages = splitIntoPassages(paragraph)

  assert.ok(passages.length > 1)
  assert.ok(passages.every(({ text }) => text.length <= MAX_CHARS))
  assert.equal(passages.map(({ text }) => text).join(' '), paragraph)
})

test('a very long text with no sentence ends is still cut', () => {
  const passages = splitIntoPassages('a'.repeat(3000))

  assert.ok(passages.every(({ text }) => text.length <= MAX_CHARS))
  assert.equal(passages.map(({ text }) => text).join(''), 'a'.repeat(3000))
})

test('Arabic text is cut at Arabic question marks and full stops', () => {
  const sentence = 'ما هو التمثيل الضوئي؟ هو عملية تصنع بها النباتات غذاءها.'
  const paragraph = Array.from({ length: 40 }, () => sentence).join(' ')
  const passages = splitIntoPassages(paragraph)

  assert.ok(passages.length > 1)
  assert.ok(passages.every(({ text }) => text.length <= MAX_CHARS))
  assert.ok(passages.slice(0, -1).every(({ text }) => /[.؟]$/.test(text)))
})

test('Windows line endings are handled and ids are sequential', () => {
  const big = 'y'.repeat(400)
  const passages = splitIntoPassages(`${big}\r\n\r\n${big}\r\n\r\n${big}`)

  assert.deepEqual(
    passages.map(({ id }) => id),
    ['p1', 'p2', 'p3'],
  )
})
