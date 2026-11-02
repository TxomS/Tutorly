import { postJson } from './postJson.js'

/** Asks the server to grade a student's answer. Resolves with { verdict, feedback }. */
export const requestAssessment = ({ apiKey, body, signal }) => postJson('/api/assess', { apiKey, body, signal })
