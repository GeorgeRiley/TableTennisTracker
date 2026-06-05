import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

const MEDALS = ['🥇', '🥈', '🥉']

export default function Leaderboard() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('players')
        .select('*')
        .order('rating', { ascending: false })
      setPlayers(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="p-6 text-center text-slate-400">Loading...</div>

  if (players.length === 0) {
    return (
      <div className="p-6 text-center text-slate-400">
        <p className="text-4xl mb-2">🏓</p>
        <p className="font-medium">No players yet</p>
        <p className="text-sm mt-1">Add players in the Players tab to get started</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-2">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
        Standings
      </h2>
      {players.map((player, i) => (
        <div
          key={player.id}
          className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm"
        >
          <span className="text-xl w-7 text-center">
            {i < 3 ? MEDALS[i] : <span className="text-slate-400 text-sm font-bold">{i + 1}</span>}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 truncate">{player.name}</p>
            <p className="text-xs text-slate-400">
              {player.wins ?? 0}W — {player.losses ?? 0}L
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-emerald-600">{player.rating}</p>
            <p className="text-xs text-slate-400">pts</p>
          </div>
        </div>
      ))}
    </div>
  )
}
