/**
 * Decode + loop MP3/WAV mood beds (cached per AudioContext sample-rate key).
 */

import type { MoodSynthHandle } from './moodSynth'

const bufferCache = new Map<string, AudioBuffer>()

export async function loadMoodAudio(
  ctx: BaseAudioContext,
  src: string,
): Promise<AudioBuffer> {
  const key = `${src}|${ctx.sampleRate}`
  const hit = bufferCache.get(key)
  if (hit) return hit

  const res = await fetch(src)
  if (!res.ok) throw new Error(`Failed to load mood audio: ${src}`)
  const ab = await res.arrayBuffer()
  const buffer = await ctx.decodeAudioData(ab.slice(0))
  bufferCache.set(key, buffer)
  return buffer
}

export function startMoodAudioBuffer(
  ctx: AudioContext,
  buffer: AudioBuffer,
  volume: number,
): MoodSynthHandle {
  const output = ctx.createGain()
  output.gain.value = Math.max(0, Math.min(1, volume))
  const src = ctx.createBufferSource()
  src.buffer = buffer
  src.loop = true
  src.connect(output)
  src.start()
  return {
    output,
    stop: () => {
      try {
        src.stop()
      } catch {
        /* already stopped */
      }
      try {
        src.disconnect()
      } catch {
        /* ignore */
      }
      try {
        output.disconnect()
      } catch {
        /* ignore */
      }
    },
  }
}
