import assert from 'node:assert/strict'
import { test } from 'node:test'
import { layoutFor, MAX_PAIRS, MIN_PAIRS, pairsFrom, planReview, shuffled } from './review.js'

const step = (n, count = 2) => ({
  id: `step-${n}`,
  terms: Array.from({ length: count }, (_, i) => ({ term: `Word ${n}${'abc'[i]}`, meaning: `Meaning ${n}${'abc'[i]}` })),
})
const steps = (total, count) => Array.from({ length: total }, (_, i) => step(i + 1, count))

test('the game comes after the middle step and asks only about the steps up to there', () => {
  assert.equal(planReview(steps(5)).after, 3)
  assert.equal(planReview(steps(4)).after, 2)
  assert.equal(planReview(steps(3)).after, 2)
  assert.equal(planReview(steps(12)).after, 6)

  const { pairs } = planReview(steps(5))
  assert.ok(pairs.every(({ step: stepNumber }) => stepNumber <= 3))
  assert.deepEqual([...new Set(pairs.map(({ step: stepNumber }) => stepNumber))], [1, 2, 3])
})

test('a lesson shorter than three steps has no game', () => {
  assert.equal(planReview(steps(2)), null)
  assert.equal(planReview(steps(1)), null)
})

test('a lesson with too few key terms before the middle has no game, and one with none at all is fine', () => {
  assert.equal(planReview(steps(5, 0)), null)
  assert.equal(planReview([step(1, 1), step(2, 0), step(3, 0), step(4, 2), step(5, 2)]), null)
  assert.equal(planReview(steps(5, 1)).pairs.length, MIN_PAIRS)
  assert.equal(planReview([{ id: 'a' }, { id: 'b' }, { id: 'c' }]), null)
})

test('terms from later steps never count towards the game', () => {
  const lateTerms = [step(1, 1), step(2, 1), step(3, 0), step(4, 3), step(5, 3)]

  assert.equal(planReview(lateTerms), null)
})

test('the game is never bigger than the maximum, and every step still gets a place in it', () => {
  const { pairs } = planReview(steps(12, 3))

  assert.equal(pairs.length, MAX_PAIRS)
  assert.deepEqual(pairs.map(({ step: stepNumber }) => stepNumber), [1, 2, 3, 4, 5, 6])
})

test('pairs are taken in rounds: every step\'s first term before any step\'s second', () => {
  const pairs = pairsFrom(steps(3, 3)).map(({ term }) => term)

  assert.deepEqual(pairs, ['Word 1a', 'Word 2a', 'Word 3a', 'Word 1b', 'Word 2b', 'Word 3b'])
})

test('every pair has an id of its own', () => {
  const ids = pairsFrom(steps(3, 2)).map(({ id }) => id)

  assert.equal(new Set(ids).size, ids.length)
})

test('a term or meaning that appears twice is used once, so two cards can never both match', () => {
  const twice = [
    { id: 's1', terms: [{ term: 'Root', meaning: 'Takes in water' }, { term: 'Leaf', meaning: 'Catches light' }] },
    { id: 's2', terms: [{ term: 'root', meaning: 'Something else' }, { term: 'Stem', meaning: 'catches LIGHT' }, { term: 'Seed', meaning: 'Starts a new plant' }] },
  ]

  assert.deepEqual(pairsFrom(twice).map(({ term }) => term), ['Root', 'Leaf', 'Seed'])
})

test('shuffling keeps every item and does not change the list it was given', () => {
  const items = [1, 2, 3, 4, 5]
  const result = shuffled(items)

  assert.deepEqual([...result].sort(), items)
  assert.deepEqual(items, [1, 2, 3, 4, 5])
})

test('shuffling can be given a known source of randomness', () => {
  const alwaysZero = () => 0

  assert.deepEqual(shuffled([1, 2, 3, 4], alwaysZero), [2, 3, 4, 1])
})

test('the words and the meanings are never laid out in the same order', () => {
  const { pairs } = planReview(steps(5))
  const sameForBoth = () => 0.3

  for (const random of [sameForBoth, Math.random, () => 0, () => 0.99]) {
    const { words, meanings } = layoutFor(pairs, random)

    assert.deepEqual(words.map(({ id }) => id).sort(), pairs.map(({ id }) => id).sort())
    assert.deepEqual(meanings.map(({ id }) => id).sort(), pairs.map(({ id }) => id).sort())
    assert.notDeepEqual(meanings.map(({ id }) => id), words.map(({ id }) => id))
  }
})
