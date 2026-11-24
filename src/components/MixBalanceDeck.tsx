import {
  MANIFESTATION_PRESETS,
  SWEET_SPOT_DB,
  type ManifestationMode,
} from '../audio/manifestationCalibration'

export type MixBusKey = 'soundtrack' | 'ambient' | 'frequency' | 'voice'

export interface MixBalanceLevels {
  soundtrackDb: number
  ambientDb: number
  frequencyDb: number
  voiceDb: number
}

interface Props {
  levels: MixBalanceLevels
  mode: ManifestationMode
  onChange: (bus: MixBusKey, db: number) => void
  onApplyMode: (mode: ManifestationMode) => void
  /** Defaults to applying `standard` (Optimal Mix Reset) */
  onOptimalReset?: () => void
  title?: string
  className?: string
}

const SLIDERS: {
  key: MixBusKey
  label: string
  sweet: number
}[] = [
  { key: 'soundtrack', label: 'Music / Soundtrack', sweet: SWEET_SPOT_DB.soundtrack },
  { key: 'ambient', label: 'Ambient noise', sweet: SWEET_SPOT_DB.ambient },
  { key: 'frequency', label: 'Frequency', sweet: SWEET_SPOT_DB.frequency },
  { key: 'voice', label: 'Voice', sweet: SWEET_SPOT_DB.voice },
]

const DB_MIN = -48
const DB_MAX = 0

function dbToPct(db: number): number {
  return ((db - DB_MIN) / (DB_MAX - DB_MIN)) * 100
}

function DbSlider({
  label,
  valueDb,
  sweetSpotDb,
  onChange,
}: {
  label: string
  valueDb: number
  sweetSpotDb: number
  onChange: (db: number) => void
}) {
  const sweetPct = dbToPct(sweetSpotDb)
  return (
    <label className="block">
      <span className="field-label">
        {label} · {valueDb.toFixed(1)} dB
      </span>
      <div className="mix-balance-track relative mt-1">
        <span
          className="mix-balance-sweet"
          style={{ left: `${sweetPct}%` }}
          title={`Sweet spot ${sweetSpotDb} dB`}
          aria-hidden
        />
        <input
          className="field-range w-full"
          type="range"
          min={DB_MIN}
          max={DB_MAX}
          step={0.1}
          value={Math.max(DB_MIN, Math.min(DB_MAX, valueDb))}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-valuetext={`${valueDb.toFixed(1)} dBFS`}
        />
      </div>
    </label>
  )
}

export function MixBalanceDeck({
  levels,
  mode,
  onChange,
  onApplyMode,
  onOptimalReset,
  title = 'Mix balance',
  className = '',
}: Props) {
  const reset = () => {
    if (onOptimalReset) onOptimalReset()
    else onApplyMode('standard')
  }

  return (
    <section className={`panel space-y-4 p-4 sm:p-5 ${className}`.trim()}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="panel-title text-sm sm:text-base">{title}</h2>
        <button type="button" className="btn btn-teal text-xs sm:text-sm" onClick={reset}>
          ✨ Optimal Mix Reset
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Manifestation calibration mode">
        {(Object.keys(MANIFESTATION_PRESETS) as ManifestationMode[]).map((id) => {
          const p = MANIFESTATION_PRESETS[id]
          return (
            <button
              key={id}
              type="button"
              className="chip chip-teal"
              data-active={mode === id}
              title={p.blurb}
              onClick={() => onApplyMode(id)}
            >
              {p.label}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-muted">{MANIFESTATION_PRESETS[mode].blurb}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        {SLIDERS.map((s) => (
          <DbSlider
            key={s.key}
            label={s.label}
            valueDb={levels[`${s.key}Db`]}
            sweetSpotDb={s.sweet}
            onChange={(db) => onChange(s.key, db)}
          />
        ))}
      </div>
    </section>
  )
}
