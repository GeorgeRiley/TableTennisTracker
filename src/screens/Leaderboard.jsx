import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { getTier } from '../levels'

const MEDALS = ['🥇', '🥈', '🥉']

function FormDots({ playerIds, allHistory }) {
  if (!allHistory) return null
  const results = (allHistory[playerIds] ?? []).slice(0, 5)
  if (results.length === 0) return null
  return (
    <div className="flex gap-1 mt-1">
      {results.map((won, i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full"
          style={{ background: won ? '#4ade80' : '#d4196e' }}
        />
      ))}
    </div>
  )
}

export default function Leaderboard() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [formHistory, setFormHistory] = useState({})

  useEffect(() => {
    async function load() {
      const { data: playerData } = await supabase
        .from('players')
        .select('*')
        .order('rating', { ascending: false })
      const players = playerData ?? []
      setPlayers(players)

      // Fetch last 5 results per player from rating_history
      if (players.length > 0) {
        const ids = players.map(p => p.id)
        const { data: histData } = await supabase
          .from('rating_history')
          .select('player_id, points_change')
          .in('player_id', ids)
          .order('created_at', { ascending: false })

        // Group into map: { playerId: [true, false, ...] } (true=win)
        const map = {}
        for (const row of histData ?? []) {
          if (!map[row.player_id]) map[row.player_id] = []
          if (map[row.player_id].length < 5) {
            map[row.player_id].push(row.points_change > 0)
          }
        }
        setFormHistory(map)
      }

      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="p-6 text-center text-sm" style={{ color: '#4a6080' }}>Loading...</div>

  if (players.length === 0) {
    return (
      <div className="p-8 text-center" style={{ color: '#4a6080' }}>
        <p className="text-4xl mb-2">🏓</p>
        <p className="font-medium text-white">No players yet</p>
        <p className="text-sm mt-1">Add players in the Players tab to get started</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6dd5f0' }}>
        Standings
      </h2>
      {players.map((player, i) => (
        <div
          key={player.id}
          className="rounded-xl px-4 py-3 flex items-center gap-3"
          style={{ background: i === 0 ? 'linear-gradient(135deg, #5c1942 0%, #1a2f55 100%)' : '#112244', border: '1px solid #1e3a5f' }}
        >
          <span className="text-xl w-7 text-center flex-shrink-0">
            {i < 3 ? MEDALS[i] : <span className="text-sm font-bold" style={{ color: '#4a6080' }}>{i + 1}</span>}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-white truncate">{player.name}</p>
              {(() => {
                const tier = getTier(player.rating)
                return (
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-md flex-shrink-0"
                    style={{ background: tier.bg, color: tier.color, border: `1px solid ${tier.border}` }}>
                    {tier.emoji} {tier.name}
                  </span>
                )
              })()}
            </div>
            <p className="text-xs" style={{ color: '#4a6080' }}>
              {player.wins ?? 0}W — {player.losses ?? 0}L
            </p>
            <FormDots playerIds={player.id} allHistory={formHistory} />
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold" style={{ color: '#6dd5f0' }}>{player.rating}</p>
            <p className="text-xs" style={{ color: '#4a6080' }}>pts</p>
          </div>
        </div>
      ))}
    </div>
  )
}
