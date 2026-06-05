/**
 * Rating points calculation for table tennis games.
 *
 * Formula factors:
 * 1. Base points from opponent rating (Elo-style expected score)
 * 2. Margin multiplier — winning by more earns/costs more
 * 3. Game length multiplier — longer games (first to 21) are weighted higher
 *    than short games (first to 5) since they better reflect true skill
 */

const BASE_RATING = 1000
const K_FACTOR = 32

function expectedScore(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

function marginMultiplier(winnerScore, loserScore, gameTo) {
  const margin = winnerScore - loserScore
  const maxMargin = winnerScore // winner always has gameTo points
  // Ranges from 1.0 (1-point win) to 1.5 (shutout/maximum margin)
  return 1 + 0.5 * (margin / maxMargin)
}

function gameLengthMultiplier(gameTo) {
  // Longer games carry more weight
  const map = { 5: 0.7, 7: 0.85, 11: 1.0, 15: 1.1, 21: 1.25 }
  return map[gameTo] ?? 1.0
}

/**
 * Returns { winnerChange, loserChange } — both are signed integers.
 * winnerChange is positive, loserChange is negative.
 */
export function calculateRatingChanges(winnerRating, loserRating, winnerScore, loserScore, gameTo) {
  const expected = expectedScore(winnerRating, loserRating)
  const margin = marginMultiplier(winnerScore, loserScore, gameTo)
  const length = gameLengthMultiplier(gameTo)

  const base = K_FACTOR * (1 - expected) * margin * length
  const winnerChange = Math.round(base)
  // Loser always loses the same absolute amount the winner gains
  const loserChange = -winnerChange

  return { winnerChange, loserChange }
}

export { BASE_RATING }
