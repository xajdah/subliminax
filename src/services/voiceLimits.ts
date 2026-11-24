/** Studio voice duration guardrails */

import { countWords } from './scriptGenerator'

/** Self-record teleprompter hard cap */
export const RECORD_MAX_SECONDS = 30 * 60
export const RECORD_MAX_MS = RECORD_MAX_SECONDS * 1000

/** Narrator TTS + Voice Clone hard cap on generated/spoken audio */
export const TTS_MAX_SECONDS = 2 * 60
export const TTS_MAX_MS = TTS_MAX_SECONDS * 1000

/** Spoken pacing assumption at rate = 1.0 (~150 wpm) */
export const TTS_SECONDS_PER_WORD = 0.4

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

/** Estimated spoken duration for TTS at the given speech rate. */
export function estimateTtsSeconds(script: string, rate = 1): number {
  const words = countWords(script)
  if (!words) return 0
  const safeRate = Math.max(0.5, Math.min(2, rate || 1))
  return (words * TTS_SECONDS_PER_WORD) / safeRate
}

export function isTtsOverLimit(script: string, rate = 1): boolean {
  return estimateTtsSeconds(script, rate) > TTS_MAX_SECONDS
}

/** Trim script so estimated TTS duration stays ≤ maxSeconds. */
export function trimScriptToTtsLimit(
  script: string,
  rate = 1,
  maxSeconds = TTS_MAX_SECONDS,
): string {
  const words = script.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return ''
  const safeRate = Math.max(0.5, Math.min(2, rate || 1))
  const maxWords = Math.max(1, Math.floor((maxSeconds * safeRate) / TTS_SECONDS_PER_WORD))
  if (words.length <= maxWords) return script.trim()
  let cut = words.slice(0, maxWords).join(' ')
  const lastStop = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('!'), cut.lastIndexOf('?'))
  if (lastStop > cut.length * 0.5) cut = cut.slice(0, lastStop + 1)
  else if (!/[.!?]$/.test(cut)) cut = `${cut}.`
  return cut.trim()
}

/** Slice an AudioBuffer to at most maxSeconds (copy into a new buffer). */
export function truncateAudioBuffer(
  ctx: BaseAudioContext,
  buffer: AudioBuffer,
  maxSeconds: number,
): AudioBuffer {
  const maxFrames = Math.floor(ctx.sampleRate * maxSeconds)
  if (buffer.length <= maxFrames) return buffer
  const out = ctx.createBuffer(buffer.numberOfChannels, maxFrames, buffer.sampleRate)
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    out.copyToChannel(buffer.getChannelData(ch).subarray(0, maxFrames), ch)
  }
  return out
}
