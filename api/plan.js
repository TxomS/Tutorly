import { handleJsonRequest } from '../server/jsonEndpoint.js'
import { createPlan, parsePlanRequest } from '../server/planner.js'

// Planning reads the whole source before answering, so it gets longer than a chat reply.
const PLAN_TIMEOUT_MS = 60_000

export default (req, res) =>
  handleJsonRequest(req, res, {
    name: 'plan',
    timeoutMs: PLAN_TIMEOUT_MS,
    run: async ({ apiKey, body, signal }) => ({ plan: await createPlan({ apiKey, ...parsePlanRequest(body), signal }) }),
  })
