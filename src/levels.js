export const TIERS = [
  {
    name: 'Bronze',
    min: 0, max: 1099,
    color: '#cd7f32',
    bg: '#112244',
    cardGradient: '#112244',
    border: '1px solid #1e3a5f',
    progressColor: '#cd7f32',
    emoji: '🥉',
  },
  {
    name: 'Silver',
    min: 1100, max: 1249,
    color: '#c8d8e8',
    bg: '#1a2535',
    cardGradient: 'linear-gradient(135deg, #1e2e42 0%, #2a3a50 100%)',
    border: '1px solid #4a6a8a',
    progressColor: '#a8c8e8',
    emoji: '🥈',
  },
  {
    name: 'Gold',
    min: 1250, max: 1449,
    color: '#f5c842',
    bg: '#241a08',
    cardGradient: 'linear-gradient(135deg, #2e1f06 0%, #3a2a0a 100%)',
    border: '1px solid #7a5a10',
    progressColor: '#f5c842',
    emoji: '🥇',
  },
  {
    name: 'Platinum',
    min: 1450, max: Infinity,
    color: '#6dd5f0',
    bg: '#0a1e2e',
    cardGradient: 'linear-gradient(135deg, #0a2238 0%, #0d3348 50%, #5c1942 100%)',
    border: '1px solid #2a7a9a',
    progressColor: '#6dd5f0',
    emoji: '💎',
  },
]

export function getTier(rating) {
  return TIERS.find(t => rating >= t.min && rating <= t.max) ?? TIERS[0]
}

export function getProgress(rating) {
  const tier = getTier(rating)
  if (tier.name === 'Platinum') return 100
  const range = tier.max - tier.min + 1
  const progress = rating - tier.min
  return Math.round((progress / range) * 100)
}

export function getNextTier(rating) {
  const current = getTier(rating)
  const idx = TIERS.indexOf(current)
  return idx < TIERS.length - 1 ? TIERS[idx + 1] : null
}
