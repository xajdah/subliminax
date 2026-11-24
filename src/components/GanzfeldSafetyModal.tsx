import { useState } from 'react'

interface Props {
  open: boolean
  onAccept: () => void
  onCancel: () => void
}

export function GanzfeldSafetyModal({ open, onAccept, onCancel }: Props) {
  const [checked, setChecked] = useState(false)

  if (!open) return null

  return (
    <div
      className="ganzfeld-safety-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ganzfeld-safety-title"
    >
      <button type="button" className="ganzfeld-safety-backdrop" aria-label="Cancel" onClick={onCancel} />
      <div className="ganzfeld-safety-panel panel">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bronze-soft">
          Photosensitive Safety
        </p>
        <h2 id="ganzfeld-safety-title" className="panel-title mt-2 text-xl">
          Photic Flicker Disclaimer
        </h2>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
          <p>
            Ganzfeld Visual Sync uses <span className="text-ink">rapid luminance flicker</span> and
            closed-eye chromotherapy pulses phase-locked to brainwave entrainment frequencies
            (about 0.5–40 Hz).
          </p>
          <p className="rounded-lg border border-[color-mix(in_oklab,#b91c1c_45%,transparent)] bg-[color-mix(in_oklab,#b91c1c_12%,transparent)] px-3 py-2 text-ink">
            Do <strong>not</strong> use photic flicker modes if you have photosensitive epilepsy, a
            history of seizures, or severe migraine disorders. Consult a clinician if unsure.
          </p>
          <p>
            Prefer the safer <span className="text-ink">Breathing Ganzfeld Drift</span> mode (no
            rapid strobing) if you are flicker-sensitive. You can exit instantly anytime with{' '}
            <kbd className="ganzfeld-kbd">Esc</kbd> or a single tap/click on the canvas.
          </p>
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-ink">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-[var(--accent)]"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <span>I Understand &amp; Accept the photosensitive risk and choose to continue.</span>
        </label>

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!checked}
            onClick={() => {
              if (!checked) return
              onAccept()
            }}
          >
            I Understand &amp; Accept
          </button>
        </div>
      </div>
    </div>
  )
}
