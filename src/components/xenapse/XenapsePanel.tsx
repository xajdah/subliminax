import { SOLFEGGIO_TONES } from '../../presets/solfeggio'
import type {
  AmbientBedId,
  EntrainmentMode,
  SolfeggioHz,
  XenapseConfig,
} from '../../types/studio'

interface XenapsePanelProps {
  config: XenapseConfig
  compact?: boolean
  onChange: (config: XenapseConfig) => void
}

const MODES: { id: EntrainmentMode; label: string }[] = [
  { id: 'off', label: 'Off' },
  { id: 'tone', label: 'Tone' },
  { id: 'binaural', label: 'Binaural' },
  { id: 'isochronic', label: 'Isochronic' },
]

const BEDS: { id: AmbientBedId; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'pink', label: 'Pink' },
  { id: 'brown', label: 'Brown' },
  { id: 'rain', label: 'Rain' },
  { id: 'pad', label: 'Pad' },
]

export function XenapsePanel({ config, compact = false, onChange }: XenapsePanelProps) {
  const patch = (p: Partial<XenapseConfig>) => onChange({ ...config, ...p })

  return (
    <section className="panel animate-rise flex h-full flex-col p-4" aria-labelledby="xenapse-heading">
      <header className="mb-3">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-accent-soft">
          Xenapse
        </p>
        <h2 id="xenapse-heading" className="panel-title text-xl text-ink">
          Neural entrainment
        </h2>
        <p className="mt-1 text-sm text-muted">
          Frequency, pulse modulation, Solfeggio tones, and ambient beds.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <div>
          <span className="field-label">Mode</span>
          <div className="flex flex-wrap gap-2">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className="chip chip-teal"
                data-active={config.mode === m.id}
                onClick={() => patch({ mode: m.id })}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="field-label mb-0">Solfeggio</span>
            <button
              type="button"
              className="chip"
              data-active={config.useSolfeggio}
              onClick={() =>
                patch({
                  useSolfeggio: !config.useSolfeggio,
                  solfeggioHz: config.solfeggioHz ?? 528,
                  carrierHz: config.solfeggioHz ?? config.carrierHz,
                })
              }
            >
              {config.useSolfeggio ? 'On' : 'Off'}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SOLFEGGIO_TONES.map((tone) => (
              <button
                key={tone.hz}
                type="button"
                className="chip"
                title={tone.note}
                data-active={config.useSolfeggio && config.solfeggioHz === tone.hz}
                onClick={() =>
                  patch({
                    useSolfeggio: true,
                    solfeggioHz: tone.hz as SolfeggioHz,
                    carrierHz: tone.hz,
                  })
                }
              >
                {tone.hz}
              </button>
            ))}
          </div>
        </div>

        <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
          <label className="block">
            <span className="field-label">Carrier Hz</span>
            <input
              className="field-input"
              type="number"
              min={20}
              max={2000}
              step={1}
              value={config.carrierHz}
              onChange={(e) =>
                patch({
                  carrierHz: Number(e.target.value),
                  useSolfeggio: false,
                  solfeggioHz: null,
                })
              }
            />
          </label>
          <label className="block">
            <span className="field-label">Tone gain</span>
            <input
              className="field-range"
              type="range"
              min={0}
              max={0.5}
              step={0.01}
              value={config.toneGain}
              onChange={(e) => patch({ toneGain: Number(e.target.value) })}
            />
          </label>
          {(config.mode === 'binaural' || !compact) && (
            <label className="block">
              <span className="field-label">Beat Hz (binaural)</span>
              <input
                className="field-input"
                type="number"
                min={0.5}
                max={40}
                step={0.1}
                value={config.beatHz}
                onChange={(e) => patch({ beatHz: Number(e.target.value) })}
              />
            </label>
          )}
          {(config.mode === 'isochronic' || !compact) && (
            <label className="block">
              <span className="field-label">Pulse Hz (isochronic)</span>
              <input
                className="field-input"
                type="number"
                min={0.5}
                max={40}
                step={0.1}
                value={config.pulseHz}
                onChange={(e) => patch({ pulseHz: Number(e.target.value) })}
              />
            </label>
          )}
        </div>

        <div>
          <span className="field-label">Ambient bed</span>
          <div className="mb-3 flex flex-wrap gap-2">
            {BEDS.map((b) => (
              <button
                key={b.id}
                type="button"
                className="chip"
                data-active={config.ambient === b.id}
                onClick={() => patch({ ambient: b.id })}
              >
                {b.label}
              </button>
            ))}
          </div>
          {!compact && config.ambient !== 'none' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="field-label">Bed gain</span>
                <input
                  className="field-range"
                  type="range"
                  min={0}
                  max={0.6}
                  step={0.01}
                  value={config.ambientGain}
                  onChange={(e) => patch({ ambientGain: Number(e.target.value) })}
                />
              </label>
              <label className="block">
                <span className="field-label">Filter Hz</span>
                <input
                  className="field-input"
                  type="number"
                  min={80}
                  max={8000}
                  step={10}
                  value={config.ambientFilterHz}
                  onChange={(e) => patch({ ambientFilterHz: Number(e.target.value) })}
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
