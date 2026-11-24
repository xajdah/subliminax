/**
 * Overnight acoustic event classifier + wake-word dream recorder.
 * Uses getUserMedia with echoCancellation so app playback is ignored,
 * spectral heuristics for event tagging, and Web Speech API for "Record".
 */

import { psychoEngine } from './PsychoacousticEngine'
import {
  ACOUSTIC_EVENT_LABELS,
  DREAM_LANGUAGES,
  newRemId,
  type AcousticEvent,
  type AcousticEventKind,
  type DreamLanguageCode,
  type DreamLog,
} from '../types/remscribe'

export interface NightMonitorCallbacks {
  onEvent?: (event: AcousticEvent) => void
  onDream?: (dream: DreamLog) => void
  onListening?: (active: boolean) => void
  onDreamCapturing?: (active: boolean) => void
  onSpeechPartial?: (text: string) => void
  onError?: (msg: string) => void
}

type SpeechRec = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null
  onerror: ((ev: { error: string }) => void) | null
  onend: (() => void) | null
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: ArrayLike<{
    isFinal: boolean
    0: { transcript: string }
  }>
}

function getSpeechRecognitionCtor(): (new () => SpeechRec) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRec
    webkitSpeechRecognition?: new () => SpeechRec
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

function normalizeWake(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function containsWakeWord(transcript: string, words: string[]): boolean {
  const t = normalizeWake(transcript)
  return words.some((w) => {
    const nw = normalizeWake(w)
    if (!nw) return false
    return t === nw || t.startsWith(`${nw} `) || t.includes(` ${nw} `) || t.endsWith(` ${nw}`)
  })
}

interface FeatureFrame {
  rms: number
  zcr: number
  centroid: number
  hnrProxy: number
  pitchHz: number
}

function analyzeFrame(time: Float32Array, freq: Float32Array, sampleRate: number): FeatureFrame {
  let sumSq = 0
  let zc = 0
  for (let i = 0; i < time.length; i++) {
    const v = time[i]!
    sumSq += v * v
    if (i > 0 && (time[i - 1]! >= 0) !== (v >= 0)) zc++
  }
  const rms = Math.sqrt(sumSq / time.length)
  const zcr = zc / time.length

  let num = 0
  let den = 0
  for (let i = 0; i < freq.length; i++) {
    const mag = freq[i]!
    num += i * mag
    den += mag
  }
  const binHz = sampleRate / 2 / freq.length
  const centroid = den > 0 ? (num / den) * binHz : 0

  // Harmonic-to-noise proxy: peakiness of spectrum
  let peak = 0
  let mean = 0
  for (let i = 0; i < freq.length; i++) {
    mean += freq[i]!
    if (freq[i]! > peak) peak = freq[i]!
  }
  mean /= freq.length
  const hnrProxy = mean > 1e-6 ? peak / mean : 0

  // Crude pitch via autocorrelation peak
  let bestLag = 0
  let bestCorr = 0
  const minLag = Math.floor(sampleRate / 400)
  const maxLag = Math.min(time.length - 1, Math.floor(sampleRate / 60))
  for (let lag = minLag; lag < maxLag; lag++) {
    let corr = 0
    for (let i = 0; i < time.length - lag; i++) {
      corr += time[i]! * time[i + lag]!
    }
    if (corr > bestCorr) {
      bestCorr = corr
      bestLag = lag
    }
  }
  const pitchHz = bestLag > 0 && bestCorr > 0.01 ? sampleRate / bestLag : 0

  return { rms, zcr, centroid, hnrProxy, pitchHz }
}

function classifyFeatures(f: FeatureFrame, spike: boolean): AcousticEventKind | null {
  if (!spike && f.rms < 0.045) return null

  // Bell / chime: high centroid, high HNR, short spike
  if (f.centroid > 2800 && f.hnrProxy > 8 && f.zcr > 0.08) return 'bellChime'

  // Cat meow: mid-high pitch 400–1200, moderate centroid, voiced
  if (f.pitchHz > 380 && f.pitchHz < 1400 && f.hnrProxy > 4 && f.centroid > 800 && f.centroid < 3500) {
    return 'catMeow'
  }

  // Gasping / apnea spike: sudden loud broadband burst
  if (spike && f.rms > 0.18 && f.zcr > 0.12 && f.centroid > 1500) return 'gasping'

  // Cough: short broadband high ZCR
  if (spike && f.rms > 0.12 && f.zcr > 0.15 && f.centroid > 1200) return 'coughing'

  // Snoring: low pitch, low centroid, periodic, low ZCR
  if (f.pitchHz > 60 && f.pitchHz < 280 && f.centroid < 900 && f.zcr < 0.08 && f.rms > 0.05) {
    return 'snoring'
  }

  // Sleep talking vs human talking
  if (f.pitchHz > 85 && f.pitchHz < 350 && f.hnrProxy > 3.5 && f.centroid > 400 && f.centroid < 2800) {
    if (f.rms > 0.1) return 'humanTalking'
    return 'sleepTalking'
  }

  // Restless movement: broadband low-mid rumble without clear pitch
  if (f.rms > 0.08 && f.pitchHz < 70 && f.centroid < 1200 && f.zcr > 0.05) {
    return 'restlessMovement'
  }

  if (spike && f.rms > 0.1) return 'restlessMovement'
  return null
}

export class NightAcousticMonitor {
  private stream: MediaStream | null = null
  private ctx: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private raf = 0
  private running = false
  private language: DreamLanguageCode = 'en-US'
  private sessionStart = 0
  private cbs: NightMonitorCallbacks = {}
  private recognition: SpeechRec | null = null
  private wantSpeech = true
  private dreamCapturing = false
  private dreamChunks: BlobPart[] = []
  private dreamRecorder: MediaRecorder | null = null
  private dreamTranscript = ''
  private silenceTimer: number | null = null
  private lastEventAt = 0
  private eventCooldownMs = 12_000
  private clipRecorder: MediaRecorder | null = null
  private timeBuf = new Float32Array(0)
  private freqBuf = new Float32Array(0)
  private rmsEma = 0

  configure(language: DreamLanguageCode, cbs?: NightMonitorCallbacks) {
    this.language = language
    if (cbs) this.cbs = cbs
  }

  isRunning() {
    return this.running
  }

  isDreamCapturing() {
    return this.dreamCapturing
  }

  async start(language: DreamLanguageCode, sessionStartMs: number, cbs?: NightMonitorCallbacks) {
    this.language = language
    this.sessionStart = sessionStartMs
    if (cbs) this.cbs = cbs
    await this.stop()

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
    } catch {
      this.cbs.onError?.('Microphone permission denied — acoustic monitoring unavailable.')
      return
    }

    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.ctx = new Ctx()
    if (this.ctx.state === 'suspended') await this.ctx.resume()
    this.source = this.ctx.createMediaStreamSource(this.stream)
    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = 2048
    this.analyser.smoothingTimeConstant = 0.5
    this.source.connect(this.analyser)
    this.timeBuf = new Float32Array(this.analyser.fftSize)
    this.freqBuf = new Float32Array(this.analyser.frequencyBinCount)

    this.running = true
    this.wantSpeech = true
    this.cbs.onListening?.(true)
    this.loop()
    this.startSpeechRecognition()
  }

  private loop = () => {
    if (!this.running || !this.analyser || !this.ctx) return
    this.analyser.getFloatTimeDomainData(this.timeBuf)
    this.analyser.getFloatFrequencyData(this.freqBuf)

    // Convert dB freq to linear-ish magnitudes
    const mags = new Float32Array(this.freqBuf.length)
    for (let i = 0; i < this.freqBuf.length; i++) {
      mags[i] = Math.pow(10, this.freqBuf[i]! / 20)
    }

    const f = analyzeFrame(this.timeBuf, mags, this.ctx.sampleRate)
    this.rmsEma = this.rmsEma * 0.92 + f.rms * 0.08
    const spike = f.rms > this.rmsEma * 2.8 && f.rms > 0.06

    if (!this.dreamCapturing) {
      const kind = classifyFeatures(f, spike)
      if (kind) void this.emitEvent(kind, f.rms)
    } else {
      // During dream capture, silence detection for 6s stop
      if (f.rms < 0.02) {
        if (this.silenceTimer == null) {
          this.silenceTimer = window.setTimeout(() => {
            void this.finishDreamCapture()
          }, 6000)
        }
      } else if (this.silenceTimer != null) {
        window.clearTimeout(this.silenceTimer)
        this.silenceTimer = null
      }
    }

    this.raf = requestAnimationFrame(this.loop)
  }

  private async emitEvent(kind: AcousticEventKind, confidenceRaw: number) {
    const now = Date.now()
    if (now - this.lastEventAt < this.eventCooldownMs) return
    this.lastEventAt = now

    const clip = await this.captureClip(Math.min(10, Math.max(5, 6 + confidenceRaw * 4)))
    const event: AcousticEvent = {
      id: newRemId('evt'),
      kind,
      timestamp: now,
      relativeSec: (now - this.sessionStart) / 1000,
      confidence: Math.min(1, confidenceRaw * 4),
      clipUrl: clip?.url,
      clipDurationSec: clip?.durationSec,
    }
    this.cbs.onEvent?.(event)
  }

  private captureClip(seconds: number): Promise<{ url: string; durationSec: number } | null> {
    return new Promise((resolve) => {
      if (!this.stream) {
        resolve(null)
        return
      }
      try {
        const chunks: BlobPart[] = []
        const mr = new MediaRecorder(this.stream, { mimeType: preferredMime() })
        this.clipRecorder = mr
        mr.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data)
        }
        mr.onstop = () => {
          const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' })
          const url = URL.createObjectURL(blob)
          resolve({ url, durationSec: seconds })
          this.clipRecorder = null
        }
        mr.start()
        window.setTimeout(() => {
          if (mr.state === 'recording') mr.stop()
        }, seconds * 1000)
      } catch {
        resolve(null)
      }
    })
  }

  private startSpeechRecognition() {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      this.cbs.onError?.('Speech recognition unavailable in this browser — wake-word disabled.')
      return
    }
    const rec = new Ctor()
    rec.lang = this.language
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1
    rec.onresult = (ev) => {
      let interim = ''
      let finalText = ''
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i]!
        const t = r[0]?.transcript ?? ''
        if (r.isFinal) finalText += t
        else interim += t
      }
      const heard = (finalText || interim).trim()
      if (heard) this.cbs.onSpeechPartial?.(heard)

      if (this.dreamCapturing) {
        if (finalText) this.dreamTranscript += `${finalText.trim()} `
        return
      }

      const lang = DREAM_LANGUAGES.find((l) => l.code === this.language)
      const words = lang?.wakeWords ?? ['record']
      if (containsWakeWord(heard, words)) {
        void this.beginDreamCapture()
      }
    }
    rec.onerror = (ev) => {
      if (ev.error === 'not-allowed') {
        this.cbs.onError?.('Speech recognition blocked.')
        this.wantSpeech = false
      }
    }
    rec.onend = () => {
      if (this.running && this.wantSpeech) {
        try {
          rec.start()
        } catch {
          /* restart race */
        }
      }
    }
    this.recognition = rec
    try {
      rec.start()
    } catch {
      /* already started */
    }
  }

  private async beginDreamCapture() {
    if (this.dreamCapturing || !this.stream) return
    this.dreamCapturing = true
    this.dreamTranscript = ''
    this.dreamChunks = []
    this.cbs.onDreamCapturing?.(true)
    psychoEngine.playConfirmChime(432, 0.55)

    try {
      const mr = new MediaRecorder(this.stream, { mimeType: preferredMime() })
      this.dreamRecorder = mr
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) this.dreamChunks.push(e.data)
      }
      mr.start(500)
    } catch {
      this.cbs.onError?.('Could not start dream audio capture.')
    }
  }

  private async finishDreamCapture() {
    if (!this.dreamCapturing) return
    if (this.silenceTimer != null) {
      window.clearTimeout(this.silenceTimer)
      this.silenceTimer = null
    }
    this.dreamCapturing = false
    this.cbs.onDreamCapturing?.(false)

    const mr = this.dreamRecorder
    this.dreamRecorder = null
    let clipUrl: string | undefined
    let clipDurationSec: number | undefined
    if (mr && mr.state !== 'inactive') {
      clipUrl = await new Promise<string | undefined>((resolve) => {
        mr.onstop = () => {
          const blob = new Blob(this.dreamChunks, { type: mr.mimeType || 'audio/webm' })
          resolve(URL.createObjectURL(blob))
        }
        try {
          mr.stop()
        } catch {
          resolve(undefined)
        }
      })
      clipDurationSec = 8
    }

    const transcript = this.dreamTranscript.trim() || '(unintelligible dream audio)'
    const now = Date.now()
    const dream: DreamLog = {
      id: newRemId('dream'),
      timestamp: now,
      relativeSec: (now - this.sessionStart) / 1000,
      language: this.language,
      transcript,
      clipUrl,
      clipDurationSec,
    }
    this.cbs.onDream?.(dream)
    this.cbs.onEvent?.({
      id: newRemId('evt'),
      kind: 'dreamRecorded',
      timestamp: now,
      relativeSec: dream.relativeSec,
      confidence: 1,
      clipUrl,
      clipDurationSec,
    })
  }

  async stop() {
    this.running = false
    this.wantSpeech = false
    cancelAnimationFrame(this.raf)
    if (this.silenceTimer != null) {
      window.clearTimeout(this.silenceTimer)
      this.silenceTimer = null
    }
    if (this.dreamCapturing) await this.finishDreamCapture()
    try {
      this.recognition?.abort()
    } catch {
      /* noop */
    }
    this.recognition = null
    try {
      this.clipRecorder?.stop()
    } catch {
      /* noop */
    }
    this.clipRecorder = null
    try {
      this.source?.disconnect()
      void this.ctx?.close()
    } catch {
      /* noop */
    }
    this.source = null
    this.analyser = null
    this.ctx = null
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    this.cbs.onListening?.(false)
  }
}

function preferredMime(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm'
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus'
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
  return 'audio/mp4'
}

export const nightAcousticMonitor = new NightAcousticMonitor()

/** Exported for tests / morning report labels */
export { ACOUSTIC_EVENT_LABELS }
