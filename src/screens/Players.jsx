import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { BASE_RATING } from '../rating'
import { getTier, getProgress, getNextTier } from '../levels'

// Simple SVG line chart for rating history
function RatingChart({ data }) {
  if (!data || data.length < 2) return (
    <p className="text-xs text-center py-3" style={{ color: '#4a6080' }}>Play more games to see your chart</p>
  )

  const W = 300, H = 100, PAD = 12
  const ratings = data.map(d => d.rating_after)
  const minR = Math.min(...ratings)
  const maxR = Math.max(...ratings)
  const range = maxR - minR || 1

  const points = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2)
    const y = H - PAD - ((d.rating_after - minR) / range) * (H - PAD * 2)
    return [x, y]
  })

  const polyline = points.map(p => p.join(',')).join(' ')

  // Fill path
  const fillPath = `M ${points[0][0]},${H - PAD} L ${points.map(p => p.join(',')).join(' L ')} L ${points[points.length - 1][0]},${H - PAD} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 100 }}>
      <defs>
        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d4196e" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#d4196e" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill="url(#chartFill)" />
      <polyline points={polyline} fill="none" stroke="#d4196e" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* Last point dot */}
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="3" fill="#6dd5f0" />
    </svg>
  )
}

function HeadToHead({ playerId, allPlayers }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('games')
        .select('player1_id, player2_id, winner_id')
        .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)

      if (!data) { setLoading(false); return }

      // Tally W/L against each opponent
      const tally = {}
      for (const g of data) {
        const oppId = g.player1_id === playerId ? g.player2_id : g.player1_id
        if (!tally[oppId]) tally[oppId] = { wins: 0, losses: 0 }
        if (g.winner_id === playerId) tally[oppId].wins++
        else tally[oppId].losses++
      }

      const results = Object.entries(tally).map(([id, rec]) => ({
        id,
        name: allPlayers.find(p => p.id === id)?.name ?? 'Unknown',
        ...rec,
      })).sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses))

      setRecords(results)
      setLoading(false)
    }
    load()
  }, [playerId])

  if (loading) return <p className="text-xs py-2" style={{ color: '#4a6080' }}>Loading...</p>
  if (records.length === 0) return <p className="text-xs py-2" style={{ color: '#4a6080' }}>No head-to-head data yet</p>

  return (
    <div className="space-y-2">
      {records.map(r => {
        const total = r.wins + r.losses
        const winPct = Math.round((r.wins / total) * 100)
        return (
          <div key={r.id} className="rounded-xl px-4 py-3" style={{ background: '#0d1b35', border: '1px solid #1e3a5f' }}>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm font-semibold text-white">{r.name}</span>
              <span className="text-xs font-bold" style={{ color: winPct >= 50 ? '#4ade80' : '#d4196e' }}>
                {r.wins}W – {r.losses}L
              </span>
            </div>
            {/* Win bar */}
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1e3a5f' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${winPct}%`, background: winPct >= 50 ? '#4ade80' : '#d4196e' }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function NemesisVictim({ playerId, allPlayers }) {
  const [nemesis, setNemesis] = useState(null)
  const [victim, setVictim] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('games')
        .select('player1_id, player2_id, winner_id')
        .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)

      if (!data || data.length === 0) { setLoading(false); return }

      const tally = {}
      for (const g of data) {
        const oppId = g.player1_id === playerId ? g.player2_id : g.player1_id
        if (!tally[oppId]) tally[oppId] = { wins: 0, losses: 0 }
        if (g.winner_id === playerId) tally[oppId].wins++
        else tally[oppId].losses++
      }

      const records = Object.entries(tally).map(([id, rec]) => ({
        id,
        name: allPlayers.find(p => p.id === id)?.name ?? 'Unknown',
        ...rec,
      }))

      // Nemesis = most losses against (min 1 loss)
      const nem = records.filter(r => r.losses > 0).sort((a, b) => b.losses - a.losses)[0] ?? null
      // Victim = most wins against (min 1 win)
      const vic = records.filter(r => r.wins > 0).sort((a, b) => b.wins - a.wins)[0] ?? null

      setNemesis(nem)
      setVictim(vic)
      setLoading(false)
    }
    load()
  }, [playerId])

  if (loading) return <p className="text-xs py-2" style={{ color: '#4a6080' }}>Loading...</p>
  if (!nemesis && !victim) return <p className="text-xs py-2" style={{ color: '#4a6080' }}>Play more games to unlock</p>

  return (
    <div className="flex gap-3">
      {nemesis && (
        <div className="flex-1 rounded-xl p-3 text-center" style={{ background: '#2a0d1a', border: '1px solid #4a1a2a' }}>
          <p className="text-2xl mb-1">😈</p>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#d4196e' }}>Nemesis</p>
          <p className="text-sm font-bold text-white truncate">{nemesis.name}</p>
          <p className="text-xs mt-0.5" style={{ color: '#4a6080' }}>{nemesis.losses} losses</p>
        </div>
      )}
      {victim && (
        <div className="flex-1 rounded-xl p-3 text-center" style={{ background: '#0d2a1a', border: '1px solid #1a4a2a' }}>
          <p className="text-2xl mb-1">🎯</p>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#4ade80' }}>Favourite Victim</p>
          <p className="text-sm font-bold text-white truncate">{victim.name}</p>
          <p className="text-xs mt-0.5" style={{ color: '#4a6080' }}>{victim.wins} wins</p>
        </div>
      )}
    </div>
  )
}

export default function Players() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Edit/delete state
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editError, setEditError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function loadPlayers() {
    const { data } = await supabase.from('players').select('*').order('name')
    setPlayers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadPlayers() }, [])

  async function addPlayer(e) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setAdding(true)
    setError('')
    const { error: err } = await supabase.from('players').insert({ name, rating: BASE_RATING, wins: 0, losses: 0 })
    if (err) {
      setError(err.message.includes('unique') ? 'A player with that name already exists' : 'Failed to add player')
    } else {
      setNewName('')
      await loadPlayers()
    }
    setAdding(false)
  }

  async function openPlayer(player) {
    setSelectedPlayer(player)
    setEditing(false)
    setConfirmDelete(false)
    setHistoryLoading(true)
    const { data } = await supabase
      .from('rating_history')
      .select('*, games(player1_id, player2_id, player3_id, player4_id, score1, score2, game_to, winner_id, is_doubles)')
      .eq('player_id', player.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setHistory(data ?? [])
    setHistoryLoading(false)
  }

  async function saveRename() {
    const name = editName.trim()
    if (!name || name === selectedPlayer.name) return setEditing(false)
    setSaving(true)
    setEditError('')
    const { error: err } = await supabase.from('players').update({ name }).eq('id', selectedPlayer.id)
    if (err) {
      setEditError(err.message.includes('unique') ? 'Name already taken' : 'Failed to rename')
    } else {
      const updated = { ...selectedPlayer, name }
      setSelectedPlayer(updated)
      setPlayers(ps => ps.map(p => p.id === updated.id ? updated : p))
      setEditing(false)
    }
    setSaving(false)
  }

  async function deletePlayer() {
    setDeleting(true)
    await supabase.from('rating_history').delete().eq('player_id', selectedPlayer.id)
    // Remove from games (set to null) — or just delete their games
    await supabase.from('games').delete()
      .or(`player1_id.eq.${selectedPlayer.id},player2_id.eq.${selectedPlayer.id}`)
    await supabase.from('players').delete().eq('id', selectedPlayer.id)
    setSelectedPlayer(null)
    setConfirmDelete(false)
    await loadPlayers()
    setDeleting(false)
  }

  const cardStyle = { background: '#112244', border: '1px solid #1e3a5f' }

  if (selectedPlayer) {
    const chartData = [...history].reverse()
    const recentGames = history.slice(0, 10)
    const playerTier = getTier(selectedPlayer.rating)

    return (
      <div className="p-4">
        <button onClick={() => { setSelectedPlayer(null); setConfirmDelete(false); setEditing(false) }}
          className="text-sm font-medium mb-4 flex items-center gap-1" style={{ color: '#6dd5f0' }}>
          ← Back
        </button>

        {/* Profile header */}
        <div className="rounded-xl p-4 mb-4" style={{ background: playerTier.cardGradient, border: playerTier.border }}>
          {editing ? (
            <div className="space-y-2">
              <input
                autoFocus
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setEditing(false) }}
                className="w-full rounded-lg px-3 py-2 text-white text-lg font-bold"
                style={{ background: '#0d1b35', border: '2px solid #d4196e' }}
              />
              {editError && <p className="text-xs" style={{ color: '#d4196e' }}>{editError}</p>}
              <div className="flex gap-2">
                <button onClick={saveRename} disabled={saving}
                  className="flex-1 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: '#d4196e' }}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => setEditing(false)}
                  className="flex-1 py-2 rounded-lg text-sm font-bold"
                  style={{ background: '#1e3a5f', color: '#6dd5f0' }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedPlayer.name}</h2>
                  <p className="text-3xl font-bold mt-0.5" style={{ color: '#6dd5f0' }}>
                    {selectedPlayer.rating} <span className="text-base font-normal" style={{ color: '#4a6080' }}>pts</span>
                  </p>
                </div>
                <button onClick={() => { setEditName(selectedPlayer.name); setEditing(true) }}
                  className="text-xs px-3 py-1.5 rounded-lg font-semibold flex-shrink-0"
                  style={{ background: '#1e3a5f', color: '#6dd5f0' }}>
                  Rename
                </button>
              </div>

              {/* Tier progress */}
              {(() => {
                const tier = playerTier
                const next = getNextTier(selectedPlayer.rating)
                const progress = getProgress(selectedPlayer.rating)
                return (
                  <div className="rounded-lg p-3 mb-3" style={{ background: 'rgba(0,0,0,0.2)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold" style={{ color: tier.color }}>
                        {tier.emoji} {tier.name}
                      </span>
                      {next && (
                        <span className="text-xs" style={{ color: '#8a9aaa' }}>
                          {next.emoji} {next.name} in {next.min - selectedPlayer.rating} pts
                        </span>
                      )}
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: '#0d1b35' }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${progress}%`, background: tier.progressColor }} />
                    </div>
                  </div>
                )
              })()}

              <div className="flex gap-6 text-sm" style={{ color: '#4a6080' }}>
                <span><strong className="text-white">{selectedPlayer.wins ?? 0}</strong> Wins</span>
                <span><strong className="text-white">{selectedPlayer.losses ?? 0}</strong> Losses</span>
                <span><strong className="text-white">
                  {(selectedPlayer.wins ?? 0) + (selectedPlayer.losses ?? 0) > 0
                    ? Math.round(((selectedPlayer.wins ?? 0) / ((selectedPlayer.wins ?? 0) + (selectedPlayer.losses ?? 0))) * 100)
                    : 0}%
                </strong> Win rate</span>
              </div>
            </div>
          )}
        </div>

        {/* Rating chart */}
        <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6dd5f0' }}>Rating History</h3>
        <div className="rounded-xl p-4 mb-4" style={cardStyle}>
          {historyLoading
            ? <p className="text-xs text-center py-3" style={{ color: '#4a6080' }}>Loading...</p>
            : <RatingChart data={chartData} />
          }
        </div>

        {/* Nemesis & Victim */}
        <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6dd5f0' }}>Rivals</h3>
        <div className="mb-4">
          <NemesisVictim playerId={selectedPlayer.id} allPlayers={players} />
        </div>

        {/* Head to head */}
        <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6dd5f0' }}>Head to Head</h3>
        <div className="rounded-xl p-4 mb-4" style={cardStyle}>
          <HeadToHead playerId={selectedPlayer.id} allPlayers={players} />
        </div>

        {/* Recent games */}
        <h3 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6dd5f0' }}>Recent Games</h3>
        {historyLoading ? (
          <p className="text-sm text-center py-4" style={{ color: '#4a6080' }}>Loading...</p>
        ) : recentGames.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: '#4a6080' }}>No games yet</p>
        ) : (
          <div className="space-y-2 mb-6">
            {recentGames.map(h => {
              const g = h.games
              const won = g?.winner_id === selectedPlayer.id
              const isDoubles = g?.is_doubles

              // Build pairing strings for doubles
              let pairingLine = null
              if (isDoubles && g) {
                const name = id => players.find(p => p.id === id)?.name ?? '?'
                // Figure out which team this player was on
                const onTeamA = g.player1_id === selectedPlayer.id || g.player3_id === selectedPlayer.id
                const myPartner = onTeamA
                  ? name(g.player1_id === selectedPlayer.id ? g.player3_id : g.player1_id)
                  : name(g.player2_id === selectedPlayer.id ? g.player4_id : g.player2_id)
                const opp1 = onTeamA ? name(g.player2_id) : name(g.player1_id)
                const opp2 = onTeamA ? name(g.player4_id) : name(g.player3_id)
                pairingLine = `w/ ${myPartner} vs ${opp1} & ${opp2}`
              }

              return (
                <div key={h.id} className="rounded-xl px-4 py-3" style={cardStyle}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={won ? { background: '#0d2a1a', color: '#4ade80' } : { background: '#2a0d1a', color: '#d4196e' }}>
                        {won ? 'WIN' : 'LOSS'}
                      </span>
                      {isDoubles && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: '#1e3a5f', color: '#6dd5f0' }}>
                          2v2
                        </span>
                      )}
                      {g && (
                        <span className="text-xs" style={{ color: '#4a6080' }}>
                          {g.score1}–{g.score2} (to {g.game_to})
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-sm flex-shrink-0" style={{ color: h.points_change >= 0 ? '#4ade80' : '#d4196e' }}>
                      {h.points_change >= 0 ? '+' : ''}{h.points_change}
                    </span>
                  </div>
                  {pairingLine && (
                    <p className="text-xs mt-1.5" style={{ color: '#4a6080' }}>{pairingLine}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Delete */}
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)}
            className="w-full py-3 rounded-xl text-sm font-semibold mb-4"
            style={{ background: 'transparent', border: '1px solid #4a1a1a', color: '#d4196e' }}>
            Delete Player
          </button>
        ) : (
          <div className="rounded-xl p-4 mb-4 space-y-3" style={{ background: '#2a0d0d', border: '1px solid #4a1a1a' }}>
            <p className="text-sm font-semibold text-white">Delete {selectedPlayer.name}?</p>
            <p className="text-xs" style={{ color: '#9ca3af' }}>This will permanently remove the player and all their game history.</p>
            <div className="flex gap-2">
              <button onClick={deletePlayer} disabled={deleting}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-50"
                style={{ background: '#d4196e' }}>
                {deleting ? 'Deleting...' : 'Yes, delete'}
              </button>
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold"
                style={{ background: '#1e3a5f', color: '#6dd5f0' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6dd5f0' }}>Players</h2>

      <form onSubmit={addPlayer} className="rounded-xl p-4 mb-4" style={cardStyle}>
        <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#6dd5f0' }}>
          Add Player
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Player name"
            maxLength={40}
            className="flex-1 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500"
            style={{ background: '#0d1b35', border: '2px solid #1e3a5f' }}
          />
          <button type="submit" disabled={adding || !newName.trim()}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: '#d4196e' }}>
            Add
          </button>
        </div>
        {error && <p className="text-xs mt-2" style={{ color: '#d4196e' }}>{error}</p>}
      </form>

      {loading ? (
        <p className="text-center py-4 text-sm" style={{ color: '#4a6080' }}>Loading...</p>
      ) : players.length === 0 ? (
        <p className="text-center py-4 text-sm" style={{ color: '#4a6080' }}>No players yet — add one above</p>
      ) : (
        <div className="space-y-2">
          {players.map(player => (
            <button key={player.id} onClick={() => openPlayer(player)}
              className="w-full rounded-xl px-4 py-3 flex items-center justify-between text-left transition-colors"
              style={cardStyle}>
              <div>
                <p className="font-semibold text-white">{player.name}</p>
                <p className="text-xs" style={{ color: '#4a6080' }}>{player.wins ?? 0}W — {player.losses ?? 0}L</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold" style={{ color: '#6dd5f0' }}>{player.rating}</span>
                <span style={{ color: '#1e3a5f' }}>›</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
