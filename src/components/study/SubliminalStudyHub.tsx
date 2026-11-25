import { useState } from 'react'
import { getOptimalStudyConfig } from '../../audio/studyPsychoacoustics'
import { accountStorage } from '../../services/accountStorage'
import { generateStudyLesson } from '../../services/studyGenerator'
import { useTheme } from '../../hooks/useTheme'
import {
  createDefaultStudySession,
  type StudySession,
} from '../../types/study'
import { FeatureGuidelines } from '../guide/FeatureGuidelines'
import { ThemeToggle } from '../ThemeToggle'
import { StudyLessonInput } from './StudyLessonInput'
import { SubliminalStudyPlayer } from './SubliminalStudyPlayer'

interface Props {
  onHome: () => void
}

type Phase = 'setup' | 'player'

export function SubliminalStudyHub({ onHome }: Props) {
  const { theme, toggleTheme } = useTheme()
  const [session, setSession] = useState<StudySession>(() => {
    const base = createDefaultStudySession()
    const prefs = accountStorage.get().preferences
    return { ...base, outputDevice: prefs.outputDevice }
  })
  const [phase, setPhase] = useState<Phase>('setup')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const patch = (p: Partial<StudySession>) => setSession((s) => ({ ...s, ...p }))

  const calib = getOptimalStudyConfig(session.age, session.outputDevice, {
    preferGamma: session.preferGamma,
  })

  const onGenerate = async () => {
    setGenerating(true)
    setError(null)
    try {
      const generated = await generateStudyLesson(session)
      setSession((s) => ({ ...s, generated }))
      setPhase('player')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate study lesson.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-ghost" onClick={onHome}>
          ← Home
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-extrabold">
            Subliminal <span className="text-teal">Study</span>
          </h1>
          <p className="text-sm text-muted">
            OCR lessons · multi-style AI scripts · age-calibrated frequencies · headphones /
            speakers DSP
          </p>
        </div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <FeatureGuidelines entryId="subliminal-study" className="mb-5" defaultOpen={phase === 'setup'} />

      <div className="panel mb-5 flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
        <span className="font-display font-semibold text-ink">{calib.label}</span>
        <span className="text-muted">{calib.blurb}</span>
      </div>

      {phase === 'setup' ? (
        <StudyLessonInput
          session={session}
          onChange={patch}
          onGenerate={() => void onGenerate()}
          generating={generating}
          error={error}
        />
      ) : (
        <SubliminalStudyPlayer
          session={session}
          onChange={patch}
          onBack={() => setPhase('setup')}
        />
      )}
    </div>
  )
}
