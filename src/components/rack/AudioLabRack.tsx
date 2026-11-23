import type { AudioLabConfig, BrainwaveBand } from '../../types/studio'
import { BRAINWAVE_HZ } from '../../types/studio'

interface Props {
  open: boolean
  lab: AudioLabConfig
  onToggleOpen: () => void
  onChange: (lab: AudioLabConfig) => void
  onBand: (band: BrainwaveBand | null) => void
  activeBand: BrainwaveBand | null
}

function Toggle({
  label,
  hint,
  on,
  onToggle,
}: {
  label: string
  hint: string
  on: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      className="chip flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left"
      data-active={on}
      onClick={onToggle}
      title={hint}
    >
      <span className="font-display text-sm font-bold">{label}</span>
      <span className="text-[0.68rem] leading-snug text-muted">{hint}</span>
    </button>
  )
}

export function AudioLabRack({ open, lab, onToggleOpen, onChange, onBand, activeBand }: Props) {
  const patch = (p: Partial<AudioLabConfig>) => onChange({ ...lab, ...p })

  return (
    <section className="panel animate-rise overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={onToggleOpen}
        aria-expanded={open}
      >
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-accent-soft">
            Audio engineering lab
          </p>
          <h2 className="panel-title text-lg text-ink">Psychoacoustics rack</h2>
          <p className="text-sm text-muted">All advanced controls off by default — verify with X-Ray / Unveil.</p>
        </div>
        <span className="chip chip-teal" data-active={open}>
          {open ? 'Collapse' : 'Expand'}
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-border px-4 py-4">
          <div>
            <span className="field-label">Brainwave entrainment</span>
            <div className="mb-2 flex flex-wrap gap-2">
              {(['off', 'binaural', 'isochronic', 'monaural'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  className="chip chip-teal"
                  data-active={lab.entrainment === k}
                  onClick={() => patch({ entrainment: k })}
                >
                  {k}
                </button>
              ))}
            </div>
            <div className="mb-2 flex flex-wrap gap-2">
              {(Object.keys(BRAINWAVE_HZ) as BrainwaveBand[]).map((b) => (
                <button
                  key={b}
                  type="button"
                  className="chip"
                  data-active={activeBand === b}
                  onClick={() => onBand(activeBand === b ? null : b)}
                >
                  {b} {BRAINWAVE_HZ[b]} Hz
                </button>
              ))}
            </div>
            <label className="block max-w-xs">
              <span className="field-label">Entrainment gain</span>
              <input
                className="field-range"
                type="range"
                min={0}
                max={0.4}
                step={0.01}
                value={lab.entrainmentGain}
                onChange={(e) => patch({ entrainmentGain: Number(e.target.value) })}
              />
            </label>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Toggle
              label="Harmonic Resonance"
              hint="Overtone stack above the fundamental"
              on={lab.harmonicResonance}
              onToggle={() => patch({ harmonicResonance: !lab.harmonicResonance })}
            />
            <Toggle
              label="Solar-Earth Sync"
              hint="Carrier drifts ~7.6–8.3 Hz with solar clock"
              on={lab.solarEarthSync}
              onToggle={() => patch({ solarEarthSync: !lab.solarEarthSync })}
            />
            <Toggle
              label="Near-ultrasonic shift"
              hint="17.5 kHz voice lift — check with Unveil"
              on={lab.nearUltrasonicShift}
              onToggle={() => patch({ nearUltrasonicShift: !lab.nearUltrasonicShift })}
            />
            <Toggle
              label="Dual-panned reverse"
              hint="Primary + reversed/pitched opposite ear"
              on={lab.dualPannedReverse}
              onToggle={() => patch({ dualPannedReverse: !lab.dualPannedReverse })}
            />
            <Toggle
              label="Iso-Pan Matrix"
              hint="3D HRTF orbit; bass stays centred"
              on={lab.isoPanMatrix}
              onToggle={() => patch({ isoPanMatrix: !lab.isoPanMatrix })}
            />
            <Toggle
              label="Formant masking"
              hint="Melt voice into the mix"
              on={lab.formantMasking}
              onToggle={() => patch({ formantMasking: !lab.formantMasking })}
            />
            <Toggle
              label="Sleep Cycle Infiltration"
              hint="Hold narration until light-sleep window"
              on={lab.sleepCycleInfiltration}
              onToggle={() => patch({ sleepCycleInfiltration: !lab.sleepCycleInfiltration })}
            />
            <Toggle
              label="Environment Morphing"
              hint="Shape bed toward room noise"
              on={lab.environmentMorphing}
              onToggle={() => patch({ environmentMorphing: !lab.environmentMorphing })}
            />
            <Toggle
              label="Choreography timeline"
              hint="Move frequencies minute by minute"
              on={lab.choreographyEnabled}
              onToggle={() => patch({ choreographyEnabled: !lab.choreographyEnabled })}
            />
            <Toggle
              label="X-Ray focus"
              hint="Three traces: bed / carrier / voice"
              on={lab.xrayFocus}
              onToggle={() => patch({ xrayFocus: !lab.xrayFocus })}
            />
            <Toggle
              label="Bio-Sync"
              hint="Camera HRV pacing (opt-in stub)"
              on={lab.bioSync}
              onToggle={() => patch({ bioSync: !lab.bioSync })}
            />
          </div>

          {lab.isoPanMatrix && (
            <label className="block max-w-sm">
              <span className="field-label">Orbit speed</span>
              <input
                className="field-range"
                type="range"
                min={0.01}
                max={0.2}
                step={0.005}
                value={lab.isoPanSpeed}
                onChange={(e) => patch({ isoPanSpeed: Number(e.target.value) })}
              />
            </label>
          )}

          {lab.formantMasking && (
            <label className="block max-w-sm">
              <span className="field-label">Formant amount</span>
              <input
                className="field-range"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={lab.formantAmount}
                onChange={(e) => patch({ formantAmount: Number(e.target.value) })}
              />
            </label>
          )}

          <label className="block max-w-md">
            <span className="field-label">Unveil (buried layer audition)</span>
            <input
              className="field-range"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={lab.unveilAmount}
              onChange={(e) => patch({ unveilAmount: Number(e.target.value) })}
            />
            <span className="text-xs text-muted">
              {Math.round(lab.unveilAmount * 100)}% — guide “1% slide” starts near the left
            </span>
          </label>

          {lab.choreographyEnabled && (
            <div className="rounded-xl border border-border bg-bg/35 p-3">
              <span className="field-label">Timeline steps</span>
              <ul className="space-y-1 text-sm">
                {lab.choreographySteps.map((s) => (
                  <li key={s.id} className="flex justify-between gap-2 text-muted">
                    <span>
                      @{s.atMinute} min — {s.label}
                    </span>
                    <span className="tabular-nums text-ink">{s.hz} Hz</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
