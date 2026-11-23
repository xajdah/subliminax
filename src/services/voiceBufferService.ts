/**
 * Build / capture affirmation audio for the PsychoacousticEngine Voice bus.
 * Web Speech has no AudioNode tap — we synthesize a soft whispered bed timed
 * to the script, then speak aloud via voiceCloneService for the audible TTS path.
 */

import { countWords } from './scriptGenerator'
import { TTS_MAX_SECONDS, TTS_SECONDS_PER_WORD } from './voiceLimits'

/** Soft whisper-bed buffer sized to script length, hard-capped for TTS. */
export function synthesizeAffirmationBuffer(
  ctx: BaseAudioContext,
  script: string,
  opts?: { secondsPerWord?: number; maxSeconds?: number },
): AudioBuffer {
  const words = Math.max(1, countWords(script))
  const spw = opts?.secondsPerWord ?? TTS_SECONDS_PER_WORD
  const maxSec = opts?.maxSeconds ?? TTS_MAX_SECONDS
  const duration = Math.min(maxSec, Math.max(2.5, words * spw))
  const sr = ctx.sampleRate
  const len = Math.floor(sr * duration)
  const buffer = ctx.createBuffer(2, len, sr)

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch)
    let pink = 0
    for (let i = 0; i < len; i++) {
      const t = i / sr
      // Phrase envelope — gentle pulses suggesting spoken cadence
      const phrase = 0.5 + 0.5 * Math.sin(t * (Math.PI * 2) * 0.55)
      const syllable = 0.35 + 0.65 * Math.max(0, Math.sin(t * Math.PI * 2 * 3.2))
      const env = phrase * syllable * Math.min(1, t * 2) * Math.min(1, (duration - t) * 1.5)
      // Pink-ish noise + soft formant tone (whisper bed)
      const white = Math.random() * 2 - 1
      pink = pink * 0.92 + white * 0.08
      const formant =
        Math.sin(t * 2 * Math.PI * (180 + ch * 12)) * 0.15 +
        Math.sin(t * 2 * Math.PI * (420 + ch * 8)) * 0.08
      // Louder whisper bed for studio audition (cloud desktop + laptop speakers)
      data[i] = (pink * 0.55 + formant) * env * 0.72
    }
  }
  return buffer
}

/** Decode a recorded Blob into an AudioBuffer for the Voice bus. */
export async function decodeRecordingToBuffer(
  ctx: AudioContext,
  blob: Blob,
): Promise<AudioBuffer> {
  const ab = await blob.arrayBuffer()
  return ctx.decodeAudioData(ab.slice(0))
}
