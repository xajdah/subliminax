/**
 * Wires RemWindowDetector + LucidCueInjector + NightAcousticMonitor
 * into a closed-loop REM lucid cueing controller for REMscribe nights.
 */

import { AROUSAL_ABORT_WINDOW_MS, remWindowDetector } from './RemWindowDetector'
import { lucidCueInjector } from './LucidCueInjector'
import { nightAcousticMonitor } from './NightAcousticMonitor'
import {
  newRemId,
  type LucidCueConfig,
  type LucidCueEvent,
} from '../types/remscribe'

export interface LucidOrchestratorCallbacks {
  onCue?: (event: LucidCueEvent) => void
}

export class LucidCueOrchestrator {
  private timer: number | null = null
  private running = false
  private sessionStart = 0
  private config: LucidCueConfig | null = null
  private cbs: LucidOrchestratorCallbacks = {}
  private cueActive = false

  start(sessionStartMs: number, config: LucidCueConfig, cbs?: LucidOrchestratorCallbacks) {
    this.stop()
    if (!config.enabled) return
    this.sessionStart = sessionStartMs
    this.config = config
    if (cbs) this.cbs = cbs
    remWindowDetector.configure(sessionStartMs, true)
    this.running = true

    // Poll detector ~ every 8s using live mic features
    this.timer = window.setInterval(() => void this.tick(), 8000)

    // Also react to continuous features when provided via monitor callbacks externally
  }

  /** Feed live acoustic features from NightAcousticMonitor.onFeatures */
  onFeatures(features: {
    rms: number
    rmsEma: number
    breathRateEst: number
    spike: boolean
    stillnessSec: number
    recentKinds: import('../types/remscribe').AcousticEventKind[]
  }) {
    if (!this.running || !this.config?.enabled || this.cueActive) return
    const sample = remWindowDetector.sample(Date.now(), features)
    if (sample.shouldCue) void this.fireCue(sample.confidence, sample.nearestPeakMin)
  }

  onArousalSpike() {
    if (!this.cueActive) return
    lucidCueInjector.abortActive('arousal')
  }

  private async tick() {
    if (!this.running || !this.config?.enabled || this.cueActive) return
    const live = nightAcousticMonitor.getLiveFeatures()
    // Pull freshest from last onFeatures if available — getLiveFeatures is fallback
    const sample = remWindowDetector.sample(Date.now(), {
      rms: live.rmsEma * 0.8,
      rmsEma: live.rmsEma,
      breathRateEst: live.breathRateEst,
      spike: false,
      stillnessSec: live.stillnessSec,
      recentKinds: live.recentKinds,
    })
    if (sample.shouldCue) void this.fireCue(sample.confidence, sample.nearestPeakMin)
  }

  private async fireCue(confidence: number, peakMin: number | null) {
    if (!this.config || this.cueActive) return
    this.cueActive = true
    remWindowDetector.markCueFired()
    nightAcousticMonitor.watchArousal(AROUSAL_ABORT_WINDOW_MS)

    const id = newRemId('lucid')
    const relativeSec = (Date.now() - this.sessionStart) / 1000
    const timestamp = Date.now()

    const phrase =
      this.config.linkedAffirmation?.trim() ||
      this.config.whisperPhrase ||
      'You are dreaming—look at your hands'

    const handle = await lucidCueInjector.inject({
      cueKind: this.config.cueKind,
      whisperPhrase: phrase,
      ceilingPct: this.config.ceilingPct,
    })

    const result = await handle.completed
    const event: LucidCueEvent = {
      id,
      timestamp,
      relativeSec,
      confidence,
      ultradianPeakMin: peakMin,
      outcome: result.outcome,
      abortReason: result.reason,
    }
    this.cbs.onCue?.(event)

    // Post-cue dream capture window (10 minutes)
    nightAcousticMonitor.primeDreamCapture(10)
    this.cueActive = false
  }

  stop() {
    this.running = false
    if (this.timer != null) {
      window.clearInterval(this.timer)
      this.timer = null
    }
    lucidCueInjector.abortActive('session-end')
    this.cueActive = false
    this.config = null
  }
}

export const lucidCueOrchestrator = new LucidCueOrchestrator()
