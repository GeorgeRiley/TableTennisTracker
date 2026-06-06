import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase'
import { calculateRatingChanges } from '../rating'

const GAME_TO_OPTIONS = [5, 7, 11, 15, 21]

function ScoreInput({ label, value, onChange, max }) {
  function increment() { onChange(Math.min(max, (value ?? 0) + 1)) }
  function decrement() { onChange(Math.max(0, (value ?? 0) - 1)) }

  return (
    <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
      <span className="text-xs font-bold leading-tight w-full text-center" style={{ color: '#6dd5f0', whiteSpace: 'pre-line', wordBreak: 'break-word', minHeight: '2.5rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>{label}</span>
      <button type="button" onClick={increment}
        className="w-full text-white text-3xl font-bold rounded-xl py-4 transition-colors"
        style={{ background: '#d4196e' }}>+</button>
      <span className="text-5xl font-black text-white tabular-nums w-full text-center py-1">{value ?? 0}</span>
      <button type="button" onClick={decrement}
        className="w-full text-white text-3xl font-bold rounded-xl py-4 transition-colors"
        style={{ background: '#1e3a5f' }}>−</button>
    </div>
  )
}

function PlayerSelect({ value, onChange, players, placeholder }) {
  const selectStyle = {
    background: '#0d1b35', border: '2px solid #1e3a5f',
    color: value ? 'white' : '#4a6080',
    borderRadius: '0.75rem', padding: '1rem 1.1rem',
    fontSize: '1.1rem', fontWeight: '600', width: '100%',
  }
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={selectStyle}>
      <option value="">{placeholder}</option>
      {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  )
}

export default function RecordGame({ onGameRecorded }) {
  const [players, setPlayers] = useState([])
  const [mode, setMode] = useState('singles') // 'singles' | 'doubles'

  // Singles
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')

  // Doubles — team A = (da1, da2), team B = (db1, db2)
  const [da1, setDa1] = useState('')
  const [da2, setDa2] = useState('')
  const [db1, setDb1] = useState('')
  const [db2, setDb2] = useState('')

  const [score1, setScore1] = useState(0)
  const [score2, setScore2] = useState(0)
  const [gameTo, setGameTo] = useState(5)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)
  const [saved, setSaved] = useState(false)
  const savedTimer = useRef(null)

  async function loadPlayers() {
    const { data } = await supabase.from('players').select('*').order('name')
    setPlayers(data ?? [])
  }

  useEffect(() => { loadPlayers() }, [])

  // Rating preview
  useEffect(() => {
    setPreview(null)
    const validationError = validateScores(score1, score2, gameTo)
    if (validationError) return

    if (mode === 'singles') {
      if (!p1 || !p2 || p1 === p2) return
      const pp1 = players.find(p => p.id === p1)
      const pp2 = players.find(p => p.id === p2)
      if (!pp1 || !pp2) return
      const winner = score1 > score2 ? pp1 : pp2
      const loser = score1 > score2 ? pp2 : pp1
      const { winnerChange, loserChange } = calculateRatingChanges(
        winner.rating, loser.rating, Math.max(score1, score2), Math.min(score1, score2), gameTo
      )
      setPreview({
        lines: [
          { name: `🏆 ${winner.name}`, change: winnerChange, after: winner.rating + winnerChange },
          { name: loser.name, change: loserChange, after: loser.rating + loserChange },
        ]
      })
    } else {
      if (!da1 || !da2 || !db1 || !db2) return
      const selected = [da1, da2, db1, db2]
      if (new Set(selected).size !== 4) return
      const [pda1, pda2, pdb1, pdb2] = selected.map(id => players.find(p => p.id === id))
      if (!pda1 || !pda2 || !pdb1 || !pdb2) return

      const teamARating = Math.round((pda1.rating + pda2.rating) / 2)
      const teamBRating = Math.round((pdb1.rating + pdb2.rating) / 2)
      const aWins = score1 > score2
      const winnerRating = aWins ? teamARating : teamBRating
      const loserRating = aWins ? teamBRating : teamARating
      const { winnerChange, loserChange } = calculateRatingChanges(
        winnerRating, loserRating, Math.max(score1, score2), Math.min(score1, score2), gameTo
      )
      const winners = aWins ? [pda1, pda2] : [pdb1, pdb2]
      const losers = aWins ? [pdb1, pdb2] : [pda1, pda2]
      setPreview({
        lines: [
          ...winners.map(p => ({ name: `🏆 ${p.name}`, change: winnerChange, after: p.rating + winnerChange })),
          ...losers.map(p => ({ name: p.name, change: loserChange, after: p.rating + loserChange })),
        ]
      })
    }
  }, [mode, p1, p2, da1, da2, db1, db2, score1, score2, gameTo, players])

  function validateScores(s1, s2, gt) {
    if (s1 === s2) return 'Scores cannot be equal'
    if (Math.max(s1, s2) !== gt) return `Winner must have exactly ${gt} points`
    if (Math.min(s1, s2) >= gt) return `Loser score must be less than ${gt}`
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const validationError = validateScores(score1, score2, gameTo)
    if (validationError) return setError(validationError)

    if (mode === 'singles') {
      if (!p1 || !p2) return setError('Please select both players')
      if (p1 === p2) return setError('Players must be different')
      await submitSingles()
    } else {
      if (!da1 || !da2 || !db1 || !db2) return setError('Please select all four players')
      if (new Set([da1, da2, db1, db2]).size !== 4) return setError('All four players must be different')
      await submitDoubles()
    }
  }

  async function submitSingles() {
    setSubmitting(true)
    try {
      const pp1 = players.find(p => p.id === p1)
      const pp2 = players.find(p => p.id === p2)
      const winner = score1 > score2 ? pp1 : pp2
      const loser = score1 > score2 ? pp2 : pp1
      const wScore = Math.max(score1, score2)
      const lScore = Math.min(score1, score2)

      const { winnerChange, loserChange } = calculateRatingChanges(winner.rating, loser.rating, wScore, lScore, gameTo)

      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert({ player1_id: pp1.id, player2_id: pp2.id, score1, score2, game_to: gameTo, winner_id: winner.id })
        .select().single()
      if (gameError) throw gameError

      await supabase.from('players').update({ rating: winner.rating + winnerChange, wins: (winner.wins ?? 0) + 1 }).eq('id', winner.id)
      await supabase.from('players').update({ rating: Math.max(100, loser.rating + loserChange), losses: (loser.losses ?? 0) + 1 }).eq('id', loser.id)
      await supabase.from('rating_history').insert([
        { player_id: winner.id, game_id: game.id, points_change: winnerChange, rating_after: winner.rating + winnerChange },
        { player_id: loser.id, game_id: game.id, points_change: loserChange, rating_after: Math.max(100, loser.rating + loserChange) },
      ])

      // Reload players so next game uses fresh ratings
      await loadPlayers()

      // Winner stays on — keep winner in p1, clear p2
      setScore1(0)
      setScore2(0)
      setP1(winner.id)
      setP2('')
      onGameRecorded()
      clearTimeout(savedTimer.current)
      setSaved(true)
      savedTimer.current = setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError('Failed to save game. Please try again.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  async function submitDoubles() {
    setSubmitting(true)
    try {
      const [pda1, pda2, pdb1, pdb2] = [da1, da2, db1, db2].map(id => players.find(p => p.id === id))
      const aWins = score1 > score2
      const winners = aWins ? [pda1, pda2] : [pdb1, pdb2]
      const losers = aWins ? [pdb1, pdb2] : [pda1, pda2]

      const teamARating = Math.round((pda1.rating + pda2.rating) / 2)
      const teamBRating = Math.round((pdb1.rating + pdb2.rating) / 2)
      const winnerRating = aWins ? teamARating : teamBRating
      const loserRating = aWins ? teamBRating : teamARating
      const wScore = Math.max(score1, score2)
      const lScore = Math.min(score1, score2)
      const { winnerChange, loserChange } = calculateRatingChanges(winnerRating, loserRating, wScore, lScore, gameTo)

      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert({
          player1_id: pda1.id, player2_id: pdb1.id,
          player3_id: pda2.id, player4_id: pdb2.id,
          score1, score2, game_to: gameTo,
          winner_id: winners[0].id, is_doubles: true,
        })
        .select().single()
      if (gameError) throw gameError

      for (const w of winners) {
        await supabase.from('players').update({ rating: w.rating + winnerChange, wins: (w.wins ?? 0) + 1 }).eq('id', w.id)
        await supabase.from('rating_history').insert({ player_id: w.id, game_id: game.id, points_change: winnerChange, rating_after: w.rating + winnerChange })
      }
      for (const l of losers) {
        const newRating = Math.max(100, l.rating + loserChange)
        await supabase.from('players').update({ rating: newRating, losses: (l.losses ?? 0) + 1 }).eq('id', l.id)
        await supabase.from('rating_history').insert({ player_id: l.id, game_id: game.id, points_change: loserChange, rating_after: newRating })
      }

      // Reload players so next game uses fresh ratings
      await loadPlayers()

      // Winning team stays as team A, clear team B
      setScore1(0)
      setScore2(0)
      setDa1(winners[0].id)
      setDa2(winners[1].id)
      setDb1('')
      setDb2('')
      onGameRecorded()
      clearTimeout(savedTimer.current)
      setSaved(true)
      savedTimer.current = setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError('Failed to save game. Please try again.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  // Available options filtering out already-selected players
  const allSelected = mode === 'singles' ? [p1, p2] : [da1, da2, db1, db2]
  function opts(exclude) {
    return players.filter(p => !allSelected.filter(id => id !== exclude).includes(p.id))
  }

  const cardStyle = { background: '#112244', border: '1px solid #1e3a5f' }

  const teamLabel1 = mode === 'doubles'
    ? [da1 && players.find(p => p.id === da1)?.name, da2 && players.find(p => p.id === da2)?.name].filter(Boolean).join('\n') || 'Team A'
    : (p1 ? players.find(p => p.id === p1)?.name : 'Player 1')
  const teamLabel2 = mode === 'doubles'
    ? [db1 && players.find(p => p.id === db1)?.name, db2 && players.find(p => p.id === db2)?.name].filter(Boolean).join('\n') || 'Team B'
    : (p2 ? players.find(p => p.id === p2)?.name : 'Player 2')

  return (
    <div className="p-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6dd5f0' }}>
        Record Game
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Singles / Doubles toggle */}
        <div className="rounded-xl p-1 flex" style={{ background: '#112244', border: '1px solid #1e3a5f' }}>
          {['singles', 'doubles'].map(m => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setScore1(0); setScore2(0) }}
              className="flex-1 py-2.5 rounded-lg text-sm font-bold capitalize transition-colors"
              style={mode === m
                ? { background: '#d4196e', color: 'white' }
                : { background: 'transparent', color: '#4a6080' }
              }
            >
              {m}
            </button>
          ))}
        </div>

        {/* Game type */}
        <div className="rounded-xl p-4" style={cardStyle}>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#6dd5f0' }}>
            First to...
          </label>
          <div className="flex gap-2">
            {GAME_TO_OPTIONS.map(n => (
              <button key={n} type="button" onClick={() => setGameTo(n)}
                className="flex-1 py-3 rounded-xl text-base font-bold transition-colors"
                style={gameTo === n
                  ? { background: '#d4196e', color: 'white', border: '2px solid #d4196e' }
                  : { background: 'transparent', color: '#4a6080', border: '2px solid #1e3a5f' }
                }>{n}</button>
            ))}
          </div>
        </div>

        {/* Players */}
        <div className="rounded-xl p-4 space-y-3" style={cardStyle}>
          <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: '#6dd5f0' }}>
            {mode === 'doubles' ? 'Teams' : 'Players'}
          </label>

          {mode === 'singles' ? (
            <>
              <PlayerSelect value={p1} onChange={setP1} players={opts(p1)} placeholder="Select Player 1..." />
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: '#1e3a5f' }} />
                <span className="text-sm font-bold" style={{ color: '#4a6080' }}>VS</span>
                <div className="flex-1 h-px" style={{ background: '#1e3a5f' }} />
              </div>
              <PlayerSelect value={p2} onChange={setP2} players={opts(p2)} placeholder="Select Player 2..." />
            </>
          ) : (
            <>
              <p className="text-xs font-semibold" style={{ color: '#4a6080' }}>Team A</p>
              <PlayerSelect value={da1} onChange={setDa1} players={opts(da1)} placeholder="Team A — Player 1..." />
              <PlayerSelect value={da2} onChange={setDa2} players={opts(da2)} placeholder="Team A — Player 2..." />
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px" style={{ background: '#1e3a5f' }} />
                <span className="text-sm font-bold" style={{ color: '#4a6080' }}>VS</span>
                <div className="flex-1 h-px" style={{ background: '#1e3a5f' }} />
              </div>
              <p className="text-xs font-semibold" style={{ color: '#4a6080' }}>Team B</p>
              <PlayerSelect value={db1} onChange={setDb1} players={opts(db1)} placeholder="Team B — Player 1..." />
              <PlayerSelect value={db2} onChange={setDb2} players={opts(db2)} placeholder="Team B — Player 2..." />
            </>
          )}
        </div>

        {/* Scores */}
        <div className="rounded-xl p-4" style={cardStyle}>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: '#6dd5f0' }}>
            Score
          </label>
          <div className="flex gap-4 items-stretch">
            <ScoreInput label={teamLabel1} value={score1} onChange={setScore1} max={gameTo} />
            <div className="flex items-center pt-8">
              <span className="font-black text-2xl" style={{ color: '#1e3a5f' }}>—</span>
            </div>
            <ScoreInput label={teamLabel2} value={score2} onChange={setScore2} max={gameTo} />
          </div>
        </div>

        {/* Rating preview */}
        {preview && (
          <div className="rounded-xl p-4 text-sm" style={{ background: '#0d2a1a', border: '1px solid #1a4a2a' }}>
            <p className="font-semibold mb-2" style={{ color: '#6dd5f0' }}>Rating Changes</p>
            <div className="space-y-1.5">
              {preview.lines.map((l, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span style={{ color: l.change >= 0 ? 'white' : '#9ca3af' }}>{l.name}</span>
                  <span className="font-bold" style={{ color: l.change >= 0 ? '#4ade80' : '#d4196e' }}>
                    {l.change >= 0 ? '+' : ''}{l.change} → {l.after}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {saved && (
          <div className="rounded-xl px-4 py-3 text-sm font-semibold text-center" style={{ background: '#0d2a1a', border: '1px solid #1a4a2a', color: '#4ade80' }}>
            ✓ Game saved — winner stays on, select the next challenger
          </div>
        )}

        {error && (
          <p className="text-sm rounded-lg px-3 py-2" style={{ color: '#fca5a5', background: '#2a0d0d', border: '1px solid #4a1a1a' }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting}
          className="w-full text-white font-bold text-lg py-4 rounded-xl shadow disabled:opacity-50 transition-colors"
          style={{ background: '#d4196e' }}>
          {submitting ? 'Saving...' : 'Save Game'}
        </button>
      </form>
    </div>
  )
}
