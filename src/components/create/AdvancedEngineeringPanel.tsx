import { useMemo, useState } from 'react'
import {
  ADVANCED_TOOLS,
  ADVANCED_TOOL_GROUPS,
  type AdvancedToolDef,
  type ToolGroup,
} from '../../data/advancedTools'
import type { PsychoacousticState } from '../../types/psychoacoustic'
import { GanzfeldEntrainmentOverlay } from '../GanzfeldEntrainmentOverlay'
import { SubliminalXRay } from '../psycho/SubliminalXRay'
import type { BusAnalysers } from '../../audio/PsychoacousticEngine'

interface Props {
  advanced: PsychoacousticState
  /** Persist + apply live DSP when preview is running */
  onChange: (next: PsychoacousticState) => void
  analysers: BusAnalysers | null
  enginePlaying: boolean
  /** Optional next-state so preview doesn’t race a stale React session */
  onPreview: (next?: PsychoacousticState) => void
  onStopPreview: () => void
  isolateVoice: boolean
  checkMasking: boolean
  onIsolateVoice: (on: boolean) => void
  onCheckMasking: (on: boolean) => void
}

function getPath(state: PsychoacousticState, path: string): number | boolean {
  const parts = path.split('.')
  let cur: unknown = state
  for (const p of parts) {
    if (cur && typeof cur === 'object') cur = (cur as Record<string, unknown>)[p]
  }
  return cur as number | boolean
}

function setPath(state: PsychoacousticState, path: string, value: number | boolean): PsychoacousticState {
  const parts = path.split('.')
  const clone = structuredClone(state) as unknown as Record<string, unknown>
  let cur: Record<string, unknown> = clone
  for (let i = 0; i < parts.length - 1; i++) {
    cur = cur[parts[i]] as Record<string, unknown>
  }
  cur[parts[parts.length - 1]] = value
  return clone as unknown as PsychoacousticState
}

export function AdvancedEngineeringPanel({
  advanced,
  onChange,
  analysers,
  enginePlaying,
  onPreview,
  onStopPreview,
  isolateVoice,
  checkMasking,
  onIsolateVoice,
  onCheckMasking,
}: Props) {
  const [group, setGroup] = useState<ToolGroup>('space')
  const [ganzfeldOpen, setGanzfeldOpen] = useState(false)
  const tools = useMemo(() => ADVANCED_TOOLS.filter((t) => t.group === group), [group])

  const setTool = (tool: AdvancedToolDef, value: number | boolean) => {
    const next = setPath(advanced, tool.path, value)
    onChange(next)
    // First interaction starts preview with *this* state (not a stale session snapshot)
    if (!enginePlaying) onPreview(next)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="panel-title text-base">Advanced Audio Engineering</h3>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Add psychoacoustic tools to this track. Each effect includes a plain-language description.
            Preview anytime — then complete when it feels right.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!enginePlaying ? (
            <button type="button" className="btn btn-teal" onClick={() => onPreview()}>
              Preview with tools
            </button>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={onStopPreview}>
              Stop preview
            </button>
          )}
        </div>
      </div>

      <SubliminalXRay
        analysers={analysers}
        maskingThresholdDb={advanced.buses.music + advanced.breath.envelopeMaskDb}
        liveBeatHz={advanced.liveBeatHz}
        ultrasonicHz={advanced.breath.ultrasonicCarrierHz}
        ultrasonicOn={advanced.breath.ultrasonic}
        isolateVoice={isolateVoice}
        checkMasking={checkMasking}
        onIsolateVoice={onIsolateVoice}
        onCheckMasking={onCheckMasking}
        onOpenGanzfeld={() => {
          if (!enginePlaying) onPreview()
          setGanzfeldOpen(true)
        }}
      />

      <GanzfeldEntrainmentOverlay open={ganzfeldOpen} onClose={() => setGanzfeldOpen(false)} />

      <div className="flex flex-wrap gap-1">
        {ADVANCED_TOOL_GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            className={`btn text-xs ${group === g.id ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setGroup(g.id)}
          >
            {g.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">
        {ADVANCED_TOOL_GROUPS.find((g) => g.id === group)?.blurb}
      </p>

      <div className="grid gap-3">
        {tools.map((tool) => {
          const raw = getPath(advanced, tool.path)
          const active =
            tool.kind === 'toggle'
              ? Boolean(raw)
              : tool.kind === 'minutes'
                ? Number(raw) > 0
                : tool.kind === 'bipolar'
                  ? Math.abs(Number(raw)) > 0.02
                  : Number(raw) > 0.02

          return (
            <article
              key={tool.id}
              className={`rounded-xl border px-4 py-3 ${
                active
                  ? 'border-[color-mix(in_oklab,var(--accent)_45%,transparent)] bg-[color-mix(in_oklab,var(--accent)_8%,transparent)]'
                  : 'border-[var(--border)] bg-[var(--panel)]'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="font-display text-sm font-semibold text-ink">{tool.label}</h4>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{tool.description}</p>
                </div>
                {tool.kind === 'toggle' ? (
                  <button
                    type="button"
                    className={`btn shrink-0 text-xs ${active ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setTool(tool, !Boolean(raw))}
                  >
                    {active ? 'On' : 'Add'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`btn shrink-0 text-xs ${active ? 'btn-ghost' : 'btn-teal'}`}
                    onClick={() =>
                      setTool(
                        tool,
                        active
                          ? tool.kind === 'bipolar'
                            ? 0
                            : 0
                          : tool.kind === 'minutes'
                            ? 15
                            : tool.kind === 'bipolar'
                              ? -0.5
                              : 0.45,
                      )
                    }
                  >
                    {active ? 'Clear' : 'Add'}
                  </button>
                )}
              </div>

              {tool.kind !== 'toggle' && (
                <label className="mt-3 block text-xs text-muted">
                  <span className="mb-1 flex justify-between text-ink">
                    <span>Intensity</span>
                    <span className="tabular-nums">
                      {tool.kind === 'minutes'
                        ? `${Number(raw).toFixed(0)} min`
                        : tool.kind === 'bipolar' && tool.path.includes('envelopeMaskDb')
                          ? `${Number(raw).toFixed(0)} dB`
                          : tool.kind === 'bipolar'
                            ? Number(raw).toFixed(2)
                            : `${Math.round(Number(raw) * 100)}%`}
                    </span>
                  </span>
                  <input
                    type="range"
                    className="field-range w-full"
                    min={tool.min ?? 0}
                    max={tool.max ?? (tool.kind === 'minutes' ? 30 : 1)}
                    step={tool.kind === 'minutes' ? 1 : tool.path.includes('orbitSpeed') ? 0.01 : 0.01}
                    value={Number(raw)}
                    onChange={(e) => setTool(tool, Number(e.target.value))}
                  />
                </label>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
