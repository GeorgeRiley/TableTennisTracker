import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { BASE_RATING } from '../rating'

export default function Players() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  async function loadPlayers() {
    const { data } = await supabase
      .from('players')
      .select('*')
      .order('name')
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

    const { error: err } = await supabase
      .from('players')
      .insert({ name, rating: BASE_RATING, wins: 0, losses: 0 })

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
    setHistoryLoading(true)
    const { data } = await supabase
      .from('rating_history')
      .select('*, games(player1_id, player2_id, score1, score2, game_to, winner_id)')
      .eq('player_id', player.id)
      .order('created_at', { ascending: false })
      .limit(10)
    setHistory(data ?? [])
    setHistoryLoading(false)
  }

  if (selectedPlayer) {
    return (
      <div className="p-4">
        <button
          onClick={() => setSelectedPlayer(null)}
          className="text-emerald-600 text-sm font-medium mb-4 flex items-center gap-1"
        >
          ← Back
        </button>
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <h2 className="text-xl font-bold text-slate-800">{selectedPlayer.name}</h2>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{selectedPlayer.rating} <span className="text-base font-normal text-slate-400">pts</span></p>
          <div className="flex gap-6 mt-3 text-sm text-slate-500">
            <span><strong className="text-slate-700">{selectedPlayer.wins ?? 0}</strong> Wins</span>
            <span><strong className="text-slate-700">{selectedPlayer.losses ?? 0}</strong> Losses</span>
            <span><strong className="text-slate-700">
              {(selectedPlayer.wins ?? 0) + (selectedPlayer.losses ?? 0) > 0
                ? Math.round(((selectedPlayer.wins ?? 0) / ((selectedPlayer.wins ?? 0) + (selectedPlayer.losses ?? 0))) * 100)
                : 0}%
            </strong> Win rate</span>
          </div>
        </div>

        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Recent Games</h3>
        {historyLoading ? (
          <p className="text-slate-400 text-sm text-center py-4">Loading...</p>
        ) : history.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">No games yet</p>
        ) : (
          <div className="space-y-2">
            {history.map(h => {
              const won = h.games?.winner_id === selectedPlayer.id
              return (
                <div key={h.id} className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center justify-between">
                  <div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${won ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                      {won ? 'WIN' : 'LOSS'}
                    </span>
                    {h.games && (
                      <span className="text-xs text-slate-400 ml-2">
                        {h.games.score1}–{h.games.score2} (first to {h.games.game_to})
                      </span>
                    )}
                  </div>
                  <span className={`font-bold text-sm ${h.points_change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {h.points_change >= 0 ? '+' : ''}{h.points_change}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-4">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Players</h2>

      <form onSubmit={addPlayer} className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Add Player
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Player name"
            maxLength={40}
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700"
          />
          <button
            type="submit"
            disabled={adding || !newName.trim()}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 active:bg-emerald-700"
          >
            Add
          </button>
        </div>
        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
      </form>

      {loading ? (
        <p className="text-slate-400 text-center py-4">Loading...</p>
      ) : players.length === 0 ? (
        <p className="text-slate-400 text-center py-4 text-sm">No players yet — add one above</p>
      ) : (
        <div className="space-y-2">
          {players.map(player => (
            <button
              key={player.id}
              onClick={() => openPlayer(player)}
              className="w-full bg-white rounded-xl px-4 py-3 shadow-sm flex items-center justify-between text-left active:bg-slate-50"
            >
              <div>
                <p className="font-semibold text-slate-800">{player.name}</p>
                <p className="text-xs text-slate-400">{player.wins ?? 0}W — {player.losses ?? 0}L</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-600">{player.rating}</span>
                <span className="text-slate-300 text-sm">›</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
