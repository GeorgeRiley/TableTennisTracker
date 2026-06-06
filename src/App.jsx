import { useState } from 'react'
import Leaderboard from './screens/Leaderboard'
import RecordGame from './screens/RecordGame'
import Players from './screens/Players'

const TABS = [
  { id: 'leaderboard', label: 'Rankings', icon: '🏆' },
  { id: 'record', label: 'Record', icon: '🏓' },
  { id: 'players', label: 'Players', icon: '👤' },
]

export default function App() {
  const [tab, setTab] = useState('leaderboard')
  const [refreshKey, setRefreshKey] = useState(0)

  function onGameRecorded() {
    setRefreshKey(k => k + 1)
  }

  return (
    <div className="flex flex-col max-w-md mx-auto" style={{ background: '#0d1b35', height: '100svh' }}>
      <header className="flex-shrink-0 shadow-lg" style={{ background: 'linear-gradient(135deg, #5c1942 0%, #0d1b35 100%)', paddingTop: 'calc(env(safe-area-inset-top) + 1rem)', paddingBottom: '0.75rem', paddingLeft: '1.25rem', paddingRight: '1.25rem' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-tight">Table Tennis</h1>
            <p className="text-xs font-medium" style={{ color: '#6dd5f0' }}>Lunch League</p>
          </div>
          <span className="text-2xl">🏓</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {tab === 'leaderboard' && <Leaderboard key={refreshKey} />}
        {tab === 'record' && <RecordGame onGameRecorded={onGameRecorded} />}
        {tab === 'players' && <Players key={refreshKey} />}
      </main>

      <nav className="flex-shrink-0 flex border-t shadow-2xl" style={{ background: '#0f2040', borderColor: '#1e3a5f', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium transition-colors"
            style={{ color: tab === t.id ? '#6dd5f0' : '#4a6080' }}
          >
            <span className="text-lg leading-none">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
