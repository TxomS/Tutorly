import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MAX_SOURCE_CHARS } from '../../shared/limits.js'
import { explainReadError, FileReadError, kindOfFile, MAX_FILE_BYTES, readSourceFile } from './readFile.js'

const textFile = (name, content, type = '') => new File([content], name, { type })
const failureOf = (file) => readSourceFile(file).then(() => assert.fail('expected the file to be refused'), (error) => error)

test('a text file is read, and its byte order mark, Windows line endings and extra blank lines are cleaned up', async () => {
  const { text, pages } = await readSourceFile(textFile('notes.txt', '﻿First.\r\n\r\n\r\n\r\nSecond.\r\n'))

  assert.equal(text, 'First.\n\nSecond.')
  assert.equal(pages, undefined)
})

test('the file kind comes from the extension, then from the type, and other files are not readable', () => {
  assert.equal(kindOfFile({ name: 'Notes.TXT', type: '' }), 'text')
  assert.equal(kindOfFile({ name: 'lesson.md', type: '' }), 'text')
  assert.equal(kindOfFile({ name: 'book.pdf', type: '' }), 'pdf')
  assert.equal(kindOfFile({ name: 'essay.docx', type: '' }), 'docx')
  assert.equal(kindOfFile({ name: 'download', type: 'application/pdf' }), 'pdf')
  assert.equal(kindOfFile({ name: 'old.doc', type: 'application/msword' }), undefined)
  assert.equal(kindOfFile({ name: 'photo.png', type: 'image/png' }), undefined)
})

test('an unsupported file says what can be read, and an old .doc file says how to fix it', async () => {
  const picture = await failureOf(textFile('photo.png', 'x', 'image/png'))
  const oldWord = await failureOf(textFile('essay.doc', 'x'))

  assert.ok(picture instanceof FileReadError)
  assert.match(picture.message, /\.txt, \.md, \.pdf and \.docx.*"photo\.png"/)
  assert.match(oldWord.message, /Save it as \.docx/)
})

test('an empty file and a file with only blank space are refused with different messages', async () => {
  assert.match((await failureOf(textFile('empty.txt', ''))).message, /empty/)
  assert.match((await failureOf(textFile('blank.txt', '  \n\n \t '))).message, /no text/)
})

test('a file over the size limit is refused before it is read', async () => {
  const huge = { name: 'big.pdf', type: '', size: MAX_FILE_BYTES + 1, arrayBuffer: () => assert.fail('a file that is too big must not be read') }

  assert.match((await failureOf(huge)).message, /10\.0 MB\. The limit is 10 MB/)
})

test('text longer than the source limit is refused, and exactly the limit is accepted', async () => {
  assert.match((await failureOf(textFile('long.txt', 'a'.repeat(MAX_SOURCE_CHARS + 1)))).message, /too long.*300,000 characters/)
  assert.equal((await readSourceFile(textFile('limit.txt', 'a'.repeat(MAX_SOURCE_CHARS)))).text.length, MAX_SOURCE_CHARS)
})

test('a binary file renamed to .txt is refused', async () => {
  assert.match((await failureOf(textFile('fake.txt', 'abc\0def'))).message, /does not look like a text file/)
  assert.match((await failureOf(textFile('fake.md', '�'.repeat(50) + 'a'.repeat(100)))).message, /does not look like a text file/)
})

test('arabic text is read as it is', async () => {
  const { text } = await readSourceFile(textFile('lesson.txt', 'التمثيل الضوئي هو العملية التي تصنع بها النباتات غذاءها.'))

  assert.equal(text, 'التمثيل الضوئي هو العملية التي تصنع بها النباتات غذاءها.')
})

test('a file that cannot be opened gives a plain message, and a password-protected PDF says so', async () => {
  const broken = { name: 'broken.txt', type: '', size: 10, text: () => Promise.reject(new Error('disk error')) }

  const failure = await failureOf(broken)

  assert.match(failure.message, /Could not read this text file/)
  assert.equal(failure.cause.message, 'disk error')
  assert.match(explainReadError({ name: 'PasswordException' }, 'pdf'), /password-protected/)
  assert.match(explainReadError(new Error('Invalid PDF structure'), 'pdf'), /Could not read this PDF/)
  assert.match(explainReadError(new Error('not a zip'), 'docx'), /Could not read this Word file/)
})
