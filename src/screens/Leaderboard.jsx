import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { getTier } from '../levels'

const POSITION_LABEL = ['1st', '2nd', '3rd']

function FormDots({ playerIds, allHistory }) {
  if (!allHistory) return null
  const results = (allHistory[playerIds] ?? []).slice(0, 5)
  if (results.length === 0) return null
  return (
    <div className="flex gap-1 mt-1">
      {results.map((won, i) => (
        <span key={i} className="w-2 h-2 rounded-full"
          style={{ background: won ? '#4ade80' : '#d4196e' }} />
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

      if (players.length > 0) {
        const ids = players.map(p => p.id)
        const { data: histData } = await supabase
          .from('rating_history')
          .select('player_id, points_change')
          .in('player_id', ids)
          .order('created_at', { ascending: false })

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
      {players.map((player, i) => {
        const tier = getTier(player.rating)
        return (
          <div
            key={player.id}
            className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{ background: tier.cardGradient, border: tier.border }}
          >
            {/* Position */}
            <div className="flex-shrink-0 w-8 text-center">
              {i < 3
                ? <span className="text-xl">{['🥇','🥈','🥉'][i]}</span>
                : <span className="text-sm font-bold" style={{ color: '#4a6080' }}>{i + 1}</span>
              }
            </div>

            {/* Name + stats */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-white truncate">{player.name}</p>
                {tier.name !== 'Bronze' && (
                  <span className="text-xs font-bold flex-shrink-0" style={{ color: tier.color }}>
                    {tier.emoji}
                  </span>
                )}
              </div>
              <p className="text-xs" style={{ color: '#4a6080' }}>
                {player.wins ?? 0}W — {player.losses ?? 0}L
              </p>
              <FormDots playerIds={player.id} allHistory={formHistory} />
            </div>

            {/* Rating */}
            <div className="text-right flex-shrink-0">
              <p className="text-lg font-bold" style={{ color: tier.color }}>{player.rating}</p>
              <p className="text-xs" style={{ color: '#4a6080' }}>pts</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
