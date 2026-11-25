import { useEffect, useRef, useState } from 'react'
import { accountStorage, getUserVoiceSampleUrl } from '../../services/accountStorage'
import { startWavCapture, type WavCaptureHandle } from '../../services/wavRecorder'
import { VOICE_CALIBRATION_SCRIPT, type AccountStore } from '../../types/account'

interface Props {
  store: AccountStore
}

export function ProfileVoiceTab({ store }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const [level, setLevel] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [note, setNote] = useState<string | null>(null)
  const captureRef = useRef<WavCaptureHandle | null>(null)
  const rafRef = useRef(0)
  const tickRef = useRef(0)

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.clearInterval(tickRef.current)
    }
  }, [])

  const onAvatarFile = (file: File | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const size = 256
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        const scale = Math.max(size / img.width, size / img.height)
        const w = img.width * scale
        const h = img.height * scale
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
        setPreview(dataUrl)
        accountStorage.updateProfile({ avatarDataUrl: dataUrl })
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const startCal = async () => {
    setNote(null)
    try {
      const handle = await startWavCapture()
      captureRef.current = handle
      setRecording(true)
      setElapsed(0)
      const t0 = performance.now()
      const loop = () => {
        setLevel(handle.getLevel())
        setElapsed((performance.now() - t0) / 1000)
        rafRef.current = requestAnimationFrame(loop)
      }
      rafRef.current = requestAnimationFrame(loop)
      tickRef.current = window.setInterval(() => {
        if (performance.now() - t0 >= 30000) void stopCal()
      }, 400)
    } catch {
      setNote('Microphone permission denied.')
    }
  }

  const stopCal = async () => {
    cancelAnimationFrame(rafRef.current)
    window.clearInterval(tickRef.current)
    const handle = captureRef.current
    captureRef.current = null
    setRecording(false)
    setLevel(0)
    if (!handle) return
    const { blob, durationSec, objectUrl } = await handle.stop()
    await accountStorage.setVoiceSample(blob, durationSec)
    try {
      URL.revokeObjectURL(objectUrl)
    } catch {
      /* superseded by storage live URL */
    }
    setNote(`Calibrated ✓ · ${durationSec.toFixed(1)}s · 48 kHz PCM WAV`)
  }

  const avatar = preview ?? store.profile.avatarDataUrl
  const playableUrl = getUserVoiceSampleUrl() ?? (
    store.profile.userVoiceSampleUrl?.startsWith('blob:')
      ? store.profile.userVoiceSampleUrl
      : null
  )
  const calibrated =
    !!store.profile.voiceSampleCalibratedAt ||
    store.profile.userVoiceSampleUrl === 'idb:master' ||
    !!playableUrl

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <h3 className="panel-title text-base">Profile</h3>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            className="relative h-20 w-20 overflow-hidden rounded-full border border-[var(--border-strong)] bg-[var(--panel)]"
            onClick={() => fileRef.current?.click()}
            title="Upload avatar"
          >
            {avatar ? (
              <img src={avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="font-display text-2xl font-bold text-muted">
                {(store.profile.displayName || 'S')[0]?.toUpperCase()}
              </span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onAvatarFile(e.target.files?.[0] ?? null)}
          />
          <div className="min-w-0 flex-1 space-y-3">
            <label className="block">
              <span className="field-label">Username</span>
              <div className="mt-1 flex items-center gap-1">
                <span className="text-muted">@</span>
                <input
                  className="field-input w-full"
                  value={store.profile.username}
                  onChange={(e) =>
                    accountStorage.updateProfile({
                      username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 24),
                    })
                  }
                />
              </div>
            </label>
            <label className="block">
              <span className="field-label">Display name</span>
              <input
                className="field-input mt-1 w-full"
                value={store.profile.displayName}
                onChange={(e) => accountStorage.updateProfile({ displayName: e.target.value })}
              />
            </label>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-[var(--border)] p-4">
        <h3 className="panel-title text-base">Master Voice Clone Sample</h3>
        <p className="text-sm text-muted">
          High-clarity 48 kHz mono PCM WAV · guided ~30s phonetic script. Shared with Studio,
          Subliminal Study, and REMscribe via <code className="text-xs">userVoiceSampleUrl</code>.
        </p>
        <div className="rounded-lg bg-[color-mix(in_oklab,#000_20%,transparent)] p-3 font-mono text-xs leading-relaxed text-ink sm:text-sm">
          {VOICE_CALIBRATION_SCRIPT}
        </div>

        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-[width]"
              style={{ width: `${Math.min(100, level * 400)}%` }}
            />
          </div>
          <span className="tabular-nums text-xs text-muted">{elapsed.toFixed(0)}s / 30s</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {!recording ? (
            <button type="button" className="btn btn-primary" onClick={() => void startCal()}>
              {calibrated ? 'Re-record Sample' : 'Record calibration'}
            </button>
          ) : (
            <button type="button" className="btn btn-teal" onClick={() => void stopCal()}>
              Stop & save WAV
            </button>
          )}
          {playableUrl && (
            <audio controls src={playableUrl} className="h-10 max-w-full" />
          )}
          {calibrated && (
            <button
              type="button"
              className="btn btn-ghost text-xs"
              onClick={() => void accountStorage.clearVoiceSample()}
            >
              Clear sample
            </button>
          )}
        </div>
        <p className="text-sm">
          Status:{' '}
          <span className={calibrated ? 'text-teal' : 'text-muted'}>
            {calibrated
              ? `Calibrated ✓ · ${store.profile.voiceSampleDurationSec?.toFixed(1) ?? '—'}s`
              : 'Not calibrated'}
          </span>
        </p>
        {note && (
          <p className="text-xs text-muted" role="status">
            {note}
          </p>
        )}
      </section>
    </div>
  )
}
