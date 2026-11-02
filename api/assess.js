import { assessAnswer, parseAssessRequest } from '../server/assessor.js'
import { handleJsonRequest } from '../server/jsonEndpoint.js'

// Grading is a short answer, so it gets less time than planning.
const ASSESS_TIMEOUT_MS = 30_000

export default (req, res) =>
  handleJsonRequest(req, res, {
    name: 'assess',
    timeoutMs: ASSESS_TIMEOUT_MS,
    run: ({ apiKey, body, signal }) => assessAnswer({ apiKey, ...parseAssessRequest(body), signal }),
  })
