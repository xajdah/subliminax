import { MANIFESTATION_PRESETS, type ManifestationMode } from '../../audio/manifestationCalibration'
import { accountStorage } from '../../services/accountStorage'
import { DREAM_LANGUAGES, type DreamLanguageCode } from '../../types/remscribe'
import type { AccountStore } from '../../types/account'
import type { StudyOutputDevice } from '../../types/study'

interface Props {
  store: AccountStore
}

export function PreferencesTab({ store }: Props) {
  const p = store.preferences

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="panel-title text-base">Neuro-defaults & hardware</h3>
        <p className="text-sm text-muted">
          Saved across Studio, REMscribe, Focus Shield, and Subliminal Study.
        </p>
      </section>

      <Field label="Output hardware">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['headphones', 'Headphones'],
              ['speakers', 'Speakers'],
            ] as const satisfies ReadonlyArray<[StudyOutputDevice, string]>
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`btn ${p.outputDevice === id ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => accountStorage.updatePreferences({ outputDevice: id })}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Optimal mix calibration">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(MANIFESTATION_PRESETS) as ManifestationMode[]).map((id) => {
            const preset = MANIFESTATION_PRESETS[id]
            return (
              <button
                key={id}
                type="button"
                className={`btn ${p.manifestationMode === id ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => accountStorage.updatePreferences({ manifestationMode: id })}
                title={preset.blurb}
              >
                {preset.label}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-muted">
          {MANIFESTATION_PRESETS[p.manifestationMode].blurb}
        </p>
      </Field>

      <Field label="Default REMscribe language">
        <select
          className="field-input w-full max-w-xs"
          value={p.remscribeLanguage}
          onChange={(e) =>
            accountStorage.updatePreferences({
              remscribeLanguage: e.target.value as DreamLanguageCode,
            })
          }
        >
          {DREAM_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Ganzfeld safety consent">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] p-3">
          <input
            type="checkbox"
            className="mt-1 accent-[var(--accent)]"
            checked={p.ganzfeldSafetyConsent}
            onChange={(e) =>
              accountStorage.updatePreferences({ ganzfeldSafetyConsent: e.target.checked })
            }
          />
          <span className="text-sm text-ink">
            I understand Ganzfeld / sensory-reduction sessions may involve prolonged soft light and
            audio isolation. I will stop if I feel unwell and avoid use while driving or operating
            machinery. Photosensitive epilepsy: do not use rapid flicker modes.
          </span>
        </label>
      </Field>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="field-label">{label}</p>
      {children}
    </div>
  )
}
