import { useState } from 'react'
import type { BusId } from '../../audio/PsychoacousticEngine'
import type {
  NeuroIllusionParams,
  IllusionParams,
  PsychoacousticState,
  TunerTab,
} from '../../types/psychoacoustic'

interface Props {
  state: PsychoacousticState
  onPatch: (p: DeepPartial<PsychoacousticState>) => void
  onBusDb: (bus: BusId, db: number) => void
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

const TABS: { id: TunerTab; label: string }[] = [
  { id: 'space', label: 'Space 3D' },
  { id: 'somatic', label: 'Body Somatic' },
  { id: 'breath', label: 'Breath' },
  { id: 'waves', label: 'Waves & Masking' },
  { id: 'illusions', label: 'Illusions & Trance' },
]

export function PsychoacousticTunerRack({ state, onPatch, onBusDb }: Props) {
  const [tab, setTab] = useState<TunerTab>('space')

  return (
    <div className="panel p-4">
      <h3 className="panel-title mb-3 text-sm">Player Tuner Rack</h3>

      <div className="mb-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-muted">Mix Balance (dBFS)</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ['music', 'Music'],
              ['soundscape', 'Soundscape'],
              ['frequency', 'Frequency'],
              ['voice', 'Voice'],
            ] as const
          ).map(([id, label]) => (
            <Slider
              key={id}
              label={`${label} ${state.buses[id].toFixed(0)} dB`}
              min={-48}
              max={0}
              step={0.5}
              value={state.buses[id]}
              onChange={(v) => onBusDb(id, v)}
            />
          ))}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`btn text-xs ${tab === t.id ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'space' && (
        <div className="grid gap-2">
          <Pct
            label="Out-of-Head Externalizer"
            value={state.spatial.externalizer}
            onChange={(v) => onPatch({ spatial: { externalizer: v } })}
          />
          <Slider
            label={`Front ↔ Behind ${state.spatial.frontBehind.toFixed(2)}`}
            min={-1}
            max={1}
            step={0.01}
            value={state.spatial.frontBehind}
            onChange={(v) => onPatch({ spatial: { frontBehind: v } })}
          />
          <Pct
            label="Near ↔ Far Proximity"
            value={state.spatial.proximity}
            onChange={(v) => onPatch({ spatial: { proximity: v } })}
          />
          <Slider
            label={`Proximity rate ${state.spatial.proximityRate.toFixed(2)} Hz`}
            min={0}
            max={0.25}
            step={0.01}
            value={state.spatial.proximityRate}
            onChange={(v) => onPatch({ spatial: { proximityRate: v } })}
          />
          <Slider
            label={`3D Orbit ${state.spatial.orbitSpeed.toFixed(2)} Hz`}
            min={0}
            max={0.5}
            step={0.01}
            value={state.spatial.orbitSpeed}
            onChange={(v) => onPatch({ spatial: { orbitSpeed: v } })}
          />
          <div className="flex flex-wrap gap-1">
            {(['circular', 'figure8', 'overCrown'] as const).map((m) => (
              <button
                key={m}
                type="button"
                className={`btn text-xs ${state.spatial.orbitMode === m ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => onPatch({ spatial: { orbitMode: m } })}
              >
                {m}
              </button>
            ))}
          </div>
          <Pct
            label="Dual Pan / Haas"
            value={state.spatial.dualPan}
            onChange={(v) => onPatch({ spatial: { dualPan: v } })}
          />
        </div>
      )}

      {tab === 'somatic' && (
        <div className="grid gap-2">
          <Pct
            label="Sub-Harmonic Chest Bass"
            value={state.somatic.chestBass}
            onChange={(v) => onPatch({ somatic: { chestBass: v } })}
          />
          <Pct
            label="Phantom Fundamental"
            value={state.somatic.phantomFundamental}
            onChange={(v) => onPatch({ somatic: { phantomFundamental: v } })}
          />
          <Pct
            label="40 Hz Cranial Vibro-Pulse"
            value={state.somatic.cranialPulse}
            onChange={(v) => onPatch({ somatic: { cranialPulse: v } })}
          />
          <Pct
            label="ASMR Proximity Whisper"
            value={state.somatic.asmrWhisper}
            onChange={(v) => onPatch({ somatic: { asmrWhisper: v } })}
          />
        </div>
      )}

      {tab === 'breath' && (
        <div className="grid gap-2">
          <Pct
            label="Breath Sync"
            value={state.breath.breathSync}
            onChange={(v) => onPatch({ breath: { breathSync: v } })}
          />
          <div className="flex gap-1">
            {(['4-7-8', '5-5'] as const).map((p) => (
              <button
                key={p}
                type="button"
                className={`btn text-xs ${state.breath.breathPattern === p ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => onPatch({ breath: { breathPattern: p } })}
              >
                {p}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state.breath.breathLock}
              onChange={(e) => onPatch({ breath: { breathLock: e.target.checked } })}
            />
            Breath Lock (voice on exhale)
          </label>
          <Slider
            label={`Envelope Mask ${state.breath.envelopeMaskDb.toFixed(0)} dB`}
            min={-30}
            max={-6}
            step={1}
            value={state.breath.envelopeMaskDb}
            onChange={(v) => onPatch({ breath: { envelopeMaskDb: v } })}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state.breath.ultrasonic}
              onChange={(e) => onPatch({ breath: { ultrasonic: e.target.checked } })}
            />
            Ultrasonic Carrier
          </label>
          <Slider
            label={`Carrier ${state.breath.ultrasonicCarrierHz.toFixed(0)} Hz`}
            min={14500}
            max={17500}
            step={50}
            value={state.breath.ultrasonicCarrierHz}
            onChange={(v) => onPatch({ breath: { ultrasonicCarrierHz: v } })}
          />
        </div>
      )}

      {tab === 'waves' && (
        <div className="grid gap-2">
          <div className="flex flex-wrap gap-1">
            {(['binaural', 'isochronic', 'monaural', 'solfeggio', 'off'] as const).map((m) => (
              <button
                key={m}
                type="button"
                className={`btn text-xs ${state.frequency.mode === m ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => onPatch({ frequency: { mode: m } })}
              >
                {m}
              </button>
            ))}
          </div>
          <Slider
            label={`Carrier ${state.frequency.carrierHz.toFixed(0)} Hz`}
            min={40}
            max={600}
            step={1}
            value={state.frequency.carrierHz}
            onChange={(v) => onPatch({ frequency: { carrierHz: v } })}
          />
          <Slider
            label={`Beat ${state.frequency.beatHz.toFixed(1)} Hz`}
            min={0.5}
            max={40}
            step={0.1}
            value={state.frequency.beatHz}
            onChange={(v) => onPatch({ frequency: { beatHz: v } })}
          />
          <Slider
            label={`Solfeggio ${state.frequency.solfeggioHz} Hz`}
            min={174}
            max={963}
            step={1}
            value={state.frequency.solfeggioHz}
            onChange={(v) => onPatch({ frequency: { solfeggioHz: v } })}
          />
          <div className="flex flex-wrap gap-1">
            {(['white', 'pink', 'brown'] as const).map((c) => (
              <button
                key={c}
                type="button"
                className={`btn text-xs ${state.soundscapeNoise === c ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => onPatch({ soundscapeNoise: c })}
              >
                {c} noise
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'illusions' && (
        <div className="space-y-4">
          <section>
            <p className="mb-2 text-xs uppercase tracking-wide text-muted">Illusions & Trance</p>
            <div className="grid gap-2">
              {(
                [
                  ['shepardIntensity', 'Shepard-Risset Infinite Descent'],
                  ['phaseVacuum', 'Phase Vacuum / Magnetic Center'],
                  ['phantomWord', 'Phantom Word Ghost-Loop'],
                  ['stochasticBoost', 'Stochastic Resonance Dither'],
                ] as const
              ).map(([k, label]) => (
                <Pct
                  key={k}
                  label={label}
                  value={state.illusions[k]}
                  onChange={(v) => onPatch({ illusions: { [k]: v } as Partial<IllusionParams> })}
                />
              ))}
              <Slider
                label={`Inner-Monologue Formant ${state.illusions.innerVoiceFormant.toFixed(2)}`}
                min={-1}
                max={1}
                step={0.01}
                value={state.illusions.innerVoiceFormant}
                onChange={(v) => onPatch({ illusions: { innerVoiceFormant: v } })}
              />
              <Slider
                label={`Brainwave Chirp ${state.illusions.chirpDurationMinutes.toFixed(0)} min → ${state.liveBeatHz.toFixed(1)} Hz`}
                min={0}
                max={30}
                step={1}
                value={state.illusions.chirpDurationMinutes}
                onChange={(v) => onPatch({ illusions: { chirpDurationMinutes: v } })}
              />
            </div>
          </section>

          <section>
            <p className="mb-2 text-xs uppercase tracking-wide text-muted">Neuro-Illusions</p>
            <div className="grid gap-2">
              {(
                [
                  ['levitation', 'Acoustic Levitation'],
                  ['tunnelDepth', 'Infinity Whisper Corridor'],
                  ['earWhisper', 'Near-Ear Whisper Proximity'],
                  ['temporalInterference', 'Temporal Interference Gamma'],
                  ['polyCascade', 'Harmonic Brainwave Stack'],
                  ['granularHalo', 'Voice-Woven Granular Halo'],
                  ['sineSpeech', 'Sine-Wave Speech Skeleton'],
                  ['bilateralWeave', 'Bilateral EMDR Syllabic Weave'],
                ] as const
              ).map(([k, label]) => (
                <Pct
                  key={k}
                  label={label}
                  value={state.neuro[k]}
                  onChange={(v) => onPatch({ neuro: { [k]: v } as Partial<NeuroIllusionParams> })}
                />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function Pct({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <Slider
      label={`${label} ${Math.round(value * 100)}%`}
      min={0}
      max={1}
      step={0.01}
      value={value}
      onChange={onChange}
    />
  )
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
}) {
  return (
    <label className="block text-xs text-muted">
      <span className="mb-1 block text-ink">{label}</span>
      <input
        type="range"
        className="w-full accent-[var(--accent)]"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}
