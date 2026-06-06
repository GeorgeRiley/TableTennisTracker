export const TIERS = [
  { name: 'Bronze',   min: 0,    max: 1099, color: '#cd7f32', bg: '#2a1a0d', border: '#6b3f1a', emoji: '🥉' },
  { name: 'Silver',   min: 1100, max: 1249, color: '#a8b8c8', bg: '#1a1f2a', border: '#3a4a5a', emoji: '🥈' },
  { name: 'Gold',     min: 1250, max: 1449, color: '#f5c842', bg: '#2a220d', border: '#6b560a', emoji: '🥇' },
  { name: 'Platinum', min: 1450, max: Infinity, color: '#6dd5f0', bg: '#0d2233', border: '#1a5a7a', emoji: '💎' },
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
