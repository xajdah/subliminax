import { useState } from 'react'
import { LandingHero } from './components/landing/LandingHero'
import { StudioShell } from './components/StudioShell'

type Surface = 'landing' | 'studio'

export default function App() {
  const [surface, setSurface] = useState<Surface>('landing')

  if (surface === 'landing') {
    return <LandingHero onEnterStudio={() => setSurface('studio')} />
  }

  return (
    <>
      <div className="sticky top-0 z-40 flex justify-end px-4 pt-3 sm:px-6">
        <button type="button" className="btn btn-ghost" onClick={() => setSurface('landing')}>
          ← Home
        </button>
      </div>
      <StudioShell />
    </>
  )
}
