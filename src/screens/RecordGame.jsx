import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { calculateRatingChanges } from '../rating'

const GAME_TO_OPTIONS = [5, 7, 11, 15, 21]

export default function RecordGame({ onGameRecorded }) {
  const [players, setPlayers] = useState([])
  const [player1, setPlayer1] = useState('')
  const [player2, setPlayer2] = useState('')
  const [score1, setScore1] = useState('')
  const [score2, setScore2] = useState('')
  const [gameTo, setGameTo] = useState(11)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    supabase.from('players').select('*').order('name').then(({ data }) => {
      setPlayers(data ?? [])
    })
  }, [])

  // Recalculate preview whenever inputs change
  useEffect(() => {
    const s1 = parseInt(score1)
    const s2 = parseInt(score2)
    if (!player1 || !player2 || player1 === player2) return setPreview(null)
    if (isNaN(s1) || isNaN(s2)) return setPreview(null)

    const validationError = validateScores(s1, s2, gameTo)
    if (validationError) return setPreview(null)

    const p1 = players.find(p => p.id === player1)
    const p2 = players.find(p => p.id === player2)
    if (!p1 || !p2) return setPreview(null)

    const winnerId = s1 > s2 ? player1 : player2
    const winner = s1 > s2 ? p1 : p2
    const loser = s1 > s2 ? p2 : p1
    const wScore = s1 > s2 ? s1 : s2
    const lScore = s1 > s2 ? s2 : s1

    const { winnerChange, loserChange } = calculateRatingChanges(
      winner.rating, loser.rating, wScore, lScore, gameTo
    )

    setPreview({
      winner: winner.name,
      loser: loser.name,
      winnerChange,
      loserChange,
      winnerNew: winner.rating + winnerChange,
      loserNew: loser.rating + loserChange,
    })
  }, [player1, player2, score1, score2, gameTo, players])

  function validateScores(s1, s2, gt) {
    if (s1 < 0 || s2 < 0) return 'Scores cannot be negative'
    if (s1 === s2) return 'Scores cannot be equal — there must be a winner'
    const winner = Math.max(s1, s2)
    const loser = Math.min(s1, s2)
    if (winner !== gt) return `Winner must have exactly ${gt} points`
    if (loser >= gt) return `Loser score must be less than ${gt}`
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const s1 = parseInt(score1)
    const s2 = parseInt(score2)

    if (!player1 || !player2) return setError('Please select both players')
    if (player1 === player2) return setError('Players must be different')
    if (isNaN(s1) || isNaN(s2)) return setError('Please enter both scores')

    const validationError = validateScores(s1, s2, gameTo)
    if (validationError) return setError(validationError)

    const p1 = players.find(p => p.id === player1)
    const p2 = players.find(p => p.id === player2)

    const winner = s1 > s2 ? p1 : p2
    const loser = s1 > s2 ? p2 : p1
    const wScore = s1 > s2 ? s1 : s2
    const lScore = s1 > s2 ? s2 : s1

    const { winnerChange, loserChange } = calculateRatingChanges(
      winner.rating, loser.rating, wScore, lScore, gameTo
    )

    setSubmitting(true)
    try {
      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert({
          player1_id: p1.id,
          player2_id: p2.id,
          score1: s1,
          score2: s2,
          game_to: gameTo,
          winner_id: winner.id,
        })
        .select()
        .single()

      if (gameError) throw gameError

      // Update winner
      await supabase.from('players').update({
        rating: winner.rating + winnerChange,
        wins: (winner.wins ?? 0) + 1,
      }).eq('id', winner.id)

      // Update loser
      await supabase.from('players').update({
        rating: Math.max(100, loser.rating + loserChange),
        losses: (loser.losses ?? 0) + 1,
      }).eq('id', loser.id)

      // Record rating history
      await supabase.from('rating_history').insert([
        { player_id: winner.id, game_id: game.id, points_change: winnerChange, rating_after: winner.rating + winnerChange },
        { player_id: loser.id, game_id: game.id, points_change: loserChange, rating_after: Math.max(100, loser.rating + loserChange) },
      ])

      onGameRecorded()
    } catch (err) {
      setError('Failed to save game. Please try again.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const p1Options = players.filter(p => p.id !== player2)
  const p2Options = players.filter(p => p.id !== player1)

  return (
    <div className="p-4">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
        Record Game
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Game type */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Game Type (First to...)
          </label>
          <div className="flex gap-2 flex-wrap">
            {GAME_TO_OPTIONS.map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setGameTo(n)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                  gameTo === n
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Players */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Players
          </label>

          <div className="flex gap-3 items-center">
            <div className="flex-1">
              <select
                value={player1}
                onChange={e => setPlayer1(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white"
              >
                <option value="">Player 1</option>
                {p1Options.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <span className="text-slate-400 font-bold text-sm">vs</span>
            <div className="flex-1">
              <select
                value={player2}
                onChange={e => setPlayer2(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white"
              >
                <option value="">Player 2</option>
                {p2Options.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Scores */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Score
          </label>
          <div className="flex gap-3 items-center">
            <input
              type="number"
              min="0"
              max={gameTo}
              value={score1}
              onChange={e => setScore1(e.target.value)}
              placeholder="0"
              className="flex-1 border border-slate-200 rounded-lg px-3 py-3 text-center text-2xl font-bold text-slate-700"
            />
            <span className="text-slate-300 font-bold text-xl">—</span>
            <input
              type="number"
              min="0"
              max={gameTo}
              value={score2}
              onChange={e => setScore2(e.target.value)}
              placeholder="0"
              className="flex-1 border border-slate-200 rounded-lg px-3 py-3 text-center text-2xl font-bold text-slate-700"
            />
          </div>
        </div>

        {/* Rating preview */}
        {preview && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm">
            <p className="font-semibold text-emerald-800 mb-2">Rating Changes</p>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-600">🏆 {preview.winner}</span>
                <span className="font-bold text-emerald-600">+{preview.winnerChange} → {preview.winnerNew}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">{preview.loser}</span>
                <span className="font-bold text-red-500">{preview.loserChange} → {preview.loserNew}</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-emerald-600 text-white font-semibold py-3 rounded-xl shadow disabled:opacity-50 active:bg-emerald-700 transition-colors"
        >
          {submitting ? 'Saving...' : 'Save Game'}
        </button>
      </form>
    </div>
  )
}
