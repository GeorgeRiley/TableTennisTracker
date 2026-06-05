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
    setTab('leaderboard')
  }

  return (
    <div className="flex flex-col min-h-svh bg-slate-100 max-w-md mx-auto">
      <header className="bg-emerald-600 text-white px-4 py-3 shadow-md">
        <h1 className="text-xl font-bold tracking-tight">Table Tennis</h1>
        <p className="text-emerald-100 text-xs">Lunch League</p>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        {tab === 'leaderboard' && <Leaderboard key={refreshKey} onNavigate={setTab} />}
        {tab === 'record' && <RecordGame onGameRecorded={onGameRecorded} />}
        {tab === 'players' && <Players key={refreshKey} />}
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-200 flex shadow-lg">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium transition-colors ${
              tab === t.id ? 'text-emerald-600' : 'text-slate-400'
            }`}
          >
            <span className="text-lg leading-none">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
