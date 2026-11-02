/** Rejects a request before streaming starts, with a real HTTP status. */
export function sendError(res, status, code, message) {
  res.status(status).json({ error: { code, message } })
}

/** Switches the response to newline-delimited JSON: one event per line. */
export function startEventStream(res) {
  res.writeHead(200, {
    'Content-Type': 'application/x-ndjson; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
  })
}

export function writeEvent(res, event) {
  res.write(`${JSON.stringify(event)}\n`)
}
