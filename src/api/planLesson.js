import { postJson } from './postJson.js'

/** Asks the server for a lesson plan. */
export async function requestPlan({ apiKey, teacherPrompt, passages, signal }) {
  const { plan } = await postJson('/api/plan', { apiKey, body: { teacherPrompt, passages }, signal })
  return plan
}
