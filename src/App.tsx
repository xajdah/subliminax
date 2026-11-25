import { useState } from 'react'
import { AureviaSession } from './components/aurevia/AureviaSession'
import { CreateSubliminal } from './components/create/CreateSubliminal'
import { GanzfeldHub } from './components/ganzfeld/GanzfeldHub'
import { FeatureGuide } from './components/guide/FeatureGuide'
import { HomeHub } from './components/home/HomeHub'
import { SubliminalMixPlayer } from './components/player/SubliminalMixPlayer'
import { RemScribeHub } from './components/remscribe/RemScribeHub'
import { SavedMixesHub } from './components/saved/SavedMixesHub'
import { SubliminalStudyHub } from './components/study/SubliminalStudyHub'
import { VisionBoardHub } from './components/vision/VisionBoardHub'
import { clearAureviaQuery, readAureviaLaunch, type AureviaLaunch } from './data/aureviaShare'
import type { SavedMix } from './types/savedMix'
import type { AppView } from './types/studio'

export default function App() {
  const openedFromLink = useState(() => readAureviaLaunch())[0]
  const [view, setView] = useState<AppView>(openedFromLink ? 'aurevia' : 'home')
  const [launch, setLaunch] = useState<AureviaLaunch | null>(openedFromLink)
  const [editMix, setEditMix] = useState<SavedMix | null>(null)
  const [playerMixId, setPlayerMixId] = useState<string | null>(null)

  const go = (next: AppView, nextLaunch?: AureviaLaunch | null) => {
    if (next === 'aurevia') setLaunch(nextLaunch ?? null)
    else {
      setLaunch(null)
      clearAureviaQuery()
    }
    if (next === 'create' || next === 'studio' || next === 'presets') {
      setEditMix(null)
    }
    if (next !== 'player') setPlayerMixId(null)
    setView(next)
  }

  const openCreate = (mix: SavedMix | null = null) => {
    setEditMix(mix)
    setView('create')
  }

  const openPlayer = (mixId: string | null = null) => {
    setPlayerMixId(mixId)
    setView('player')
  }

  if (view === 'home') return <HomeHub onNavigate={go} />
  if (view === 'create' || view === 'studio' || view === 'presets')
    return (
      <CreateSubliminal
        key={editMix?.id ?? (view === 'presets' ? 'presets' : 'new')}
        initialMix={editMix}
        onHome={() => go('home')}
        onOpenSaved={() => setView('saved')}
      />
    )
  if (view === 'vision') return <VisionBoardHub onHome={() => go('home')} />
  if (view === 'remscribe') return <RemScribeHub onHome={() => go('home')} />
  if (view === 'ganzfeld') return <GanzfeldHub onHome={() => go('home')} />
  if (view === 'study') return <SubliminalStudyHub onHome={() => go('home')} />
  if (view === 'player')
    return (
      <SubliminalMixPlayer
        mixId={playerMixId}
        onHome={() => go('home')}
        onOpenSaved={() => setView('saved')}
        onSelectMix={(id) => setPlayerMixId(id || null)}
      />
    )
  if (view === 'aurevia')
    return (
      <AureviaSession
        key={`${launch?.path ?? 'full'}:${launch?.question ?? ''}:${launch?.fromGift ? 'gift' : 'open'}:${launch?.dream ? 'dream' : 'day'}:${launch?.quietVoice ? 'quiet' : 'voice'}`}
        launch={launch}
        onHome={() => go('home')}
      />
    )
  if (view === 'saved')
    return (
      <SavedMixesHub
        onHome={() => go('home')}
        onEdit={(mix) => openCreate(mix)}
        onCreate={() => openCreate(null)}
        onPlayInPlayer={(mix) => openPlayer(mix.id)}
      />
    )
  return <FeatureGuide onHome={() => go('home')} />
}
