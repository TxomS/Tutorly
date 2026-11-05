// The match-up game in the middle of a lesson. Pure rules only: which words it asks about, and in what order they are shown.

/** The game is for lessons of at least this many steps; in a shorter one there is no "middle" to pause in. */
export const MIN_STEPS_FOR_REVIEW = 3

/** The most pairs in one game. More than this does not fit on a phone, and is too much to hold in mind. */
export const MAX_PAIRS = 6

/** Fewer pairs than this is not worth a game. */
export const MIN_PAIRS = 3

/**
 * The pairs for these steps, in rounds: every step's first term, then every step's second term, and so on, until the game is full.
 * That keeps every step in the game when there are more words than room. A repeated term or meaning is skipped, because it would make two cards match.
 */
export function pairsFrom(steps) {
  const seenTerms = new Set()
  const seenMeanings = new Set()
  const pairs = []
  const rounds = Math.max(0, ...steps.map((step) => step.terms?.length ?? 0))

  for (let round = 0; round < rounds; round++) {
    for (const [index, step] of steps.entries()) {
      const entry = step.terms?.[round]
      if (!entry) continue
      const termKey = entry.term.toLowerCase()
      const meaningKey = entry.meaning.toLowerCase()
      if (seenTerms.has(termKey) || seenMeanings.has(meaningKey)) continue
      seenTerms.add(termKey)
      seenMeanings.add(meaningKey)
      pairs.push({ id: `${step.id}-${round + 1}`, term: entry.term, meaning: entry.meaning, step: index + 1 })
      if (pairs.length === MAX_PAIRS) return pairs
    }
  }
  return pairs
}

/**
 * Plans the game for a lesson: it comes after the middle step (after step 3 of 5, after step 2 of 4), and asks only about the steps up to there.
 * The pairs are fixed here, from those steps alone, so the game can never ask about a step the student has not reached.
 * Returns null when the lesson is too short or its steps have too few key terms; then the lesson simply has no game.
 */
export function planReview(steps) {
  if (steps.length < MIN_STEPS_FOR_REVIEW) return null
  const after = Math.ceil(steps.length / 2)
  const pairs = pairsFrom(steps.slice(0, after))
  return pairs.length >= MIN_PAIRS ? { after, pairs, phase: 'upcoming' } : null
}

/** The same items in a random order. `random` can be replaced so a test gets a known order. */
export function shuffled(items, random = Math.random) {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * The order the words and the meanings are laid out in. The two columns never come out in the same order,
 * which would show every answer as a straight line.
 */
export function layoutFor(pairs, random = Math.random) {
  const words = shuffled(pairs, random)
  let meanings = shuffled(pairs, random)
  const sameOrder = meanings.every((pair, index) => pair.id === words[index].id)
  if (sameOrder && meanings.length > 1) meanings = [...meanings.slice(1), meanings[0]]
  return { words, meanings }
}
