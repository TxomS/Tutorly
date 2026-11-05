// Limits that both the browser and the server enforce, so the browser can refuse a source early with the same number the server would use.

export const MAX_SOURCE_CHARS = 300_000

// The key words of a step, which the match-up game turns into pairs. They have to fit on a small card, so a longer one is dropped, not cut short.
export const MAX_TERMS_PER_STEP = 3
export const MAX_TERM_CHARS = 60
export const MAX_MEANING_CHARS = 100
