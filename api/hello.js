import { setTimeout as sleep } from 'node:timers/promises'

const WORDS = 'Hello from Tutorly! This text is streaming from the server, one word at a time.'.split(' ')

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')

  // `res` closes early when the client aborts; `req` does not reliably signal this.
  let aborted = false
  res.on('close', () => {
    aborted = !res.writableFinished
  })

  for (const word of WORDS) {
    if (aborted) return
    res.write(`${word} `)
    await sleep(300)
  }
  res.end()
}
