import type {
  AffirmationConfig,
  CarrierConfig,
  NarrationConfig,
  SoundscapeConfig,
  SoundscapeId,
} from '../../types/studio'
import { CARRIER_PRESETS } from '../../types/studio'

interface Props {
  carrier: CarrierConfig
  soundscape: SoundscapeConfig
  affirmations: AffirmationConfig
  narration: NarrationConfig
  compact?: boolean
  onCarrier: (c: CarrierConfig) => void
  onSoundscape: (s: SoundscapeConfig) => void
  onAffirmations: (a: AffirmationConfig) => void
  onNarration: (n: NarrationConfig) => void
  onUploadBed: (file: File) => void
  onClearBed: () => void
}

const SOUNDSCAPES: { id: SoundscapeId; label: string }[] = [
  { id: 'silence', label: 'Silence' },
  { id: 'rain', label: 'Rain' },
  { id: 'open-air', label: 'Open air' },
  { id: 'room-tone', label: 'Room tone' },
  { id: 'drone', label: 'Drone' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'forest', label: 'Forest' },
  { id: 'fireplace', label: 'Fireplace' },
]

export function SessionMixer({
  carrier,
  soundscape,
  affirmations,
  narration,
  compact,
  onCarrier,
  onSoundscape,
  onAffirmations,
  onNarration,
  onUploadBed,
  onClearBed,
}: Props) {
  return (
    <div className={`grid gap-4 ${compact ? 'lg:grid-cols-2' : 'xl:grid-cols-4'}`}>
      {/* Carrier */}
      <section className="panel animate-rise flex flex-col p-4">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-accent-soft">
          Channel 1
        </p>
        <h2 className="panel-title text-lg">Carrier frequency</h2>
        <p className="mb-3 text-sm text-muted">Solfeggio + reference tones the session sits on.</p>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {CARRIER_PRESETS.map((p) => (
            <button
              key={p.hz}
              type="button"
              className="chip"
              title={p.note}
              data-active={carrier.hz === p.hz}
              onClick={() => onCarrier({ ...carrier, hz: p.hz, band: null })}
            >
              {p.label}
            </button>
          ))}
        </div>
        <label className="mb-2 block">
          <span className="field-label">Custom Hz</span>
          <input
            className="field-input"
            type="number"
            min={1}
            max={20000}
            step={0.01}
            value={carrier.hz}
            onChange={(e) =>
              onCarrier({ ...carrier, hz: Number(e.target.value), band: null })
            }
          />
        </label>
        <label className="block">
          <span className="field-label">Volume</span>
          <input
            className="field-range"
            type="range"
            min={0}
            max={0.5}
            step={0.01}
            value={carrier.volume}
            onChange={(e) => onCarrier({ ...carrier, volume: Number(e.target.value) })}
          />
        </label>
        <button
          type="button"
          className="chip mt-2 self-start"
          data-active={carrier.muted}
          onClick={() => onCarrier({ ...carrier, muted: !carrier.muted })}
        >
          Mute
        </button>
      </section>

      {/* Soundscape */}
      <section className="panel animate-rise flex flex-col p-4">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-teal">
          Channel 2
        </p>
        <h2 className="panel-title text-lg">Soundscape</h2>
        <p className="mb-3 text-sm text-muted">Bed under the carrier — rain, air, room, drone…</p>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {SOUNDSCAPES.map((s) => (
            <button
              key={s.id}
              type="button"
              className="chip chip-teal"
              data-active={soundscape.id === s.id}
              onClick={() => onSoundscape({ ...soundscape, id: s.id })}
            >
              {s.label}
            </button>
          ))}
        </div>
        <label className="mb-2 block">
          <span className="field-label">Volume</span>
          <input
            className="field-range"
            type="range"
            min={0}
            max={0.7}
            step={0.01}
            value={soundscape.volume}
            onChange={(e) => onSoundscape({ ...soundscape, volume: Number(e.target.value) })}
          />
        </label>
        {!compact && (
          <>
            <label className="mb-2 block">
              <span className="field-label">Warmth (low-pass Hz)</span>
              <input
                className="field-input"
                type="number"
                min={200}
                max={8000}
                value={soundscape.warmthHz}
                onChange={(e) =>
                  onSoundscape({ ...soundscape, warmthHz: Number(e.target.value) })
                }
              />
            </label>
            <label className="mb-2 block">
              <span className="field-label">Pan</span>
              <input
                className="field-range"
                type="range"
                min={-1}
                max={1}
                step={0.01}
                value={soundscape.pan}
                onChange={(e) => onSoundscape({ ...soundscape, pan: Number(e.target.value) })}
              />
            </label>
          </>
        )}
        <label className="btn btn-ghost mt-1 cursor-pointer text-center">
          Upload bed
          <input
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) {
                onUploadBed(f)
                onSoundscape({ ...soundscape, customFileName: f.name })
              }
            }}
          />
        </label>
        {soundscape.customFileName && (
          <button
            type="button"
            className="mt-1 text-left text-xs text-muted underline"
            onClick={() => {
              onClearBed()
              onSoundscape({ ...soundscape, customFileName: null })
            }}
          >
            Clear {soundscape.customFileName}
          </button>
        )}
      </section>

      {/* Affirmations */}
      <section className="panel animate-rise flex flex-col p-4">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-accent-soft">
          Channel 3
        </p>
        <h2 className="panel-title text-lg">Affirmations</h2>
        <p className="mb-3 text-sm text-muted">First person, present tense — edit freely.</p>
        <div className="flex flex-1 flex-col gap-2">
          {affirmations.lines.map((line, i) => (
            <textarea
              key={i}
              className="field-textarea min-h-[3.2rem] resize-y"
              value={line}
              onChange={(e) => {
                const lines = [...affirmations.lines]
                lines[i] = e.target.value
                onAffirmations({ ...affirmations, lines })
              }}
            />
          ))}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() =>
              onAffirmations({ ...affirmations, lines: [...affirmations.lines, ''] })
            }
          >
            + Add line
          </button>
        </div>
      </section>

      {/* Narration */}
      <section className="panel animate-rise flex flex-col p-4">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-teal-mid">
          Channel 4
        </p>
        <h2 className="panel-title text-lg">Narration</h2>
        <p className="mb-3 text-sm text-muted">Device voice, narrator, Voice Print, or none.</p>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {(
            [
              ['device', 'Device'],
              ['narrator', 'Narrator'],
              ['voice-print', 'Voice Print'],
              ['none', 'No narration'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="chip chip-teal"
              data-active={narration.kind === id}
              onClick={() => onNarration({ ...narration, kind: id })}
            >
              {label}
            </button>
          ))}
        </div>

        {narration.kind === 'voice-print' && !narration.voicePrintConsent && (
          <label className="mb-3 flex items-start gap-2 rounded-xl border border-border bg-bg/40 p-3 text-sm">
            <input
              type="checkbox"
              checked={narration.voicePrintConsent}
              onChange={(e) =>
                onNarration({ ...narration, voicePrintConsent: e.target.checked })
              }
            />
            <span>
              I consent to a short voice sample being used only to synthesise my Voice Print. I can
              withdraw and delete it anytime. (API hook — local Web Speech fallback until wired.)
            </span>
          </label>
        )}

        {narration.kind !== 'none' && (
          <>
            <label className="mb-2 block">
              <span className="field-label">Volume</span>
              <input
                className="field-range"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={narration.volume}
                onChange={(e) => onNarration({ ...narration, volume: Number(e.target.value) })}
              />
            </label>
            {!compact && (
              <>
                <label className="mb-2 block">
                  <span className="field-label">Rate</span>
                  <input
                    className="field-range"
                    type="range"
                    min={0.5}
                    max={1.5}
                    step={0.01}
                    value={narration.rate}
                    onChange={(e) => onNarration({ ...narration, rate: Number(e.target.value) })}
                  />
                </label>
                <label className="mb-2 block">
                  <span className="field-label">Pitch</span>
                  <input
                    className="field-range"
                    type="range"
                    min={0.5}
                    max={1.5}
                    step={0.01}
                    value={narration.pitch}
                    onChange={(e) => onNarration({ ...narration, pitch: Number(e.target.value) })}
                  />
                </label>
                <label className="block">
                  <span className="field-label">Loop pause (ms)</span>
                  <input
                    className="field-input"
                    type="number"
                    min={400}
                    max={20000}
                    value={narration.loopPauseMs}
                    onChange={(e) =>
                      onNarration({ ...narration, loopPauseMs: Number(e.target.value) })
                    }
                  />
                </label>
              </>
            )}
          </>
        )}
      </section>
    </div>
  )
}
