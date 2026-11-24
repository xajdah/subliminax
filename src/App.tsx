import { useState } from 'react'
import { CreateSubliminal } from './components/create/CreateSubliminal'
import { HomeHub } from './components/home/HomeHub'
import { LivePlayer } from './components/player/LivePlayer'
import { RemScribeHub } from './components/remscribe/RemScribeHub'
import { VisionBoardHub } from './components/vision/VisionBoardHub'
import { ThemeToggle } from './components/ThemeToggle'
import { useTheme } from './hooks/useTheme'
import type { AppView } from './types/studio'

function Placeholder({
  title,
  body,
  onHome,
}: {
  title: string
  body: string
  onHome: () => void
}) {
  const { theme, toggleTheme } = useTheme()
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <button type="button" className="btn btn-ghost" onClick={onHome}>
          ← Home
        </button>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>
      <div className="panel p-6">
        <h1 className="panel-title text-2xl">{title}</h1>
        <p className="mt-3 text-muted">{body}</p>
      </div>
    </div>
  )
}

export default function App() {
  const [view, setView] = useState<AppView>('home')

  if (view === 'home') return <HomeHub onNavigate={setView} />
  if (view === 'create' || view === 'studio' || view === 'presets')
    return <CreateSubliminal onHome={() => setView('home')} />
  if (view === 'vision') return <VisionBoardHub onHome={() => setView('home')} />
  if (view === 'remscribe') return <RemScribeHub onHome={() => setView('home')} />
  if (view === 'player') return <LivePlayer onHome={() => setView('home')} />
  if (view === 'saved')
    return (
      <Placeholder
        title="Saved Tracks"
        body="Persistent library for completed subliminals — browse, play, edit, and export. Coming online next."
        onHome={() => setView('home')}
      />
    )
  return (
    <Placeholder
      title="Psychoacoustics Guide"
      body="Plain-language notes on carriers, brainwave bands, binaural/isochronic audio, and masking. Full guide copy can expand here."
      onHome={() => setView('home')}
    />
  )
}
