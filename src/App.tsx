import { useState, type ReactNode } from 'react'
import { AuraCalibration } from './components/AuraCalibration'
import { AureviaSession } from './components/aurevia/AureviaSession'
import { CreateSubliminal } from './components/create/CreateSubliminal'
import { GanzfeldHub } from './components/ganzfeld/GanzfeldHub'
import { FeatureGuide } from './components/guide/FeatureGuide'
import { HomeHub } from './components/home/HomeHub'
import { SavedMixMiniPlayer } from './components/player/SavedMixMiniPlayer'
import { RemScribeHub } from './components/remscribe/RemScribeHub'
import { SavedMixesHub } from './components/saved/SavedMixesHub'
import { SonicDnaScanner } from './components/SonicDnaScanner'
import { SubliminalStudyHub } from './components/study/SubliminalStudyHub'
import { VisionBoardHub } from './components/vision/VisionBoardHub'
import { clearAureviaQuery, readAureviaLaunch, type AureviaLaunch } from './data/aureviaShare'
import { useSavedMixPlayback } from './hooks/useSavedMixPlayback'
import { savedMixStorage } from './services/savedMixStorage'
import type { SavedMix } from './types/savedMix'
import type { AppView } from './types/studio'

export default function App() {
  const openedFromLink = useState(() => readAureviaLaunch())[0]
  const [view, setView] = useState<AppView>(openedFromLink ? 'aurevia' : 'home')
  const [launch, setLaunch] = useState<AureviaLaunch | null>(openedFromLink)
  const [editMix, setEditMix] = useState<SavedMix | null>(null)
  const playback = useSavedMixPlayback()

  const go = (next: AppView, nextLaunch?: AureviaLaunch | null) => {
    // Dedicated player page retired — route to Saved Tracks + mini-player.
    const target: AppView = next === 'player' ? 'saved' : next
    if (target === 'aurevia') setLaunch(nextLaunch ?? null)
    else {
      setLaunch(null)
      clearAureviaQuery()
    }
    if (target === 'create' || target === 'studio' || target === 'presets') {
      setEditMix(null)
    }
    setView(target)
  }

  const openCreate = (mix: SavedMix | null = null) => {
    setEditMix(mix)
    setView('create')
  }

  let body: ReactNode
  if (view === 'home')
    body = (
      <HomeHub
        onNavigate={go}
        onPlaySavedMix={(mixId) => {
          const mix = savedMixStorage.get(mixId)
          if (mix) void playback.playMix(mix)
        }}
      />
    )
  else if (view === 'create' || view === 'studio' || view === 'presets')
    body = (
      <CreateSubliminal
        key={editMix?.id ?? (view === 'presets' ? 'presets' : 'new')}
        initialMix={editMix}
        onHome={() => go('home')}
        onOpenSaved={() => setView('saved')}
      />
    )
  else if (view === 'vision') body = <VisionBoardHub onHome={() => go('home')} />
  else if (view === 'remscribe') body = <RemScribeHub onHome={() => go('home')} />
  else if (view === 'ganzfeld') body = <GanzfeldHub onHome={() => go('home')} />
  else if (view === 'study') body = <SubliminalStudyHub onHome={() => go('home')} />
  else if (view === 'aura')
    body = (
      <AuraCalibration
        onHome={() => go('home')}
        onGenerateTrack={() => go('create')}
      />
    )
  else if (view === 'sonicDna')
    body = (
      <SonicDnaScanner
        onHome={() => go('home')}
        onApplyToStudio={() => go('create')}
      />
    )
  else if (view === 'aurevia')
    body = (
      <AureviaSession
        key={`${launch?.path ?? 'full'}:${launch?.question ?? ''}:${launch?.fromGift ? 'gift' : 'open'}:${launch?.dream ? 'dream' : 'day'}:${launch?.quietVoice ? 'quiet' : 'voice'}`}
        launch={launch}
        onHome={() => go('home')}
      />
    )
  else if (view === 'saved' || view === 'player')
    body = (
      <SavedMixesHub
        onHome={() => go('home')}
        onEdit={(mix) => openCreate(mix)}
        onCreate={() => openCreate(null)}
        onPlay={(mix) => void playback.playMix(mix)}
        playingMixId={playback.activeMixId}
      />
    )
  else body = <FeatureGuide onHome={() => go('home')} />

  return (
    <>
      {body}
      <SavedMixMiniPlayer
        playback={playback}
        onOpenSaved={() => setView('saved')}
      />
    </>
  )
}
