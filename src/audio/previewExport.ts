/**
 * Offline WAV preview export — works even when the cloud VM has no speakers.
 * Renders a short audible audition of carrier + mood bed + optional script bed.
 */

import { getTrack } from '../data/moodTracks'
import { countWords } from '../services/scriptGenerator'
import type { CreateSession } from '../types/studio'
import { loadMoodAudio } from './moodAudio'

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
}

export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numCh = buffer.numberOfChannels
  const sr = buffer.sampleRate
  const len = buffer.length
  const bytesPerSample = 2
  const blockAlign = numCh * bytesPerSample
  const dataSize = len * blockAlign
  const ab = new ArrayBuffer(44 + dataSize)
  const view = new DataView(ab)

  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numCh, true)
  view.setUint32(24, sr, true)
  view.setUint32(28, sr * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  const channels: Float32Array[] = []
  for (let c = 0; c < numCh; c++) channels.push(buffer.getChannelData(c))

  let offset = 44
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < numCh; c++) {
      const s = Math.max(-1, Math.min(1, channels[c]![i]!))
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      offset += 2
    }
  }
  return new Blob([ab], { type: 'audio/wav' })
}

function fillTone(
  data: Float32Array,
  sr: number,
  freq: number,
  amp: number,
  type: 'sine' | 'triangle' = 'sine',
) {
  for (let i = 0; i < data.length; i++) {
    const t = i / sr
    const phase = 2 * Math.PI * freq * t
    const raw = type === 'triangle' ? (2 / Math.PI) * Math.asin(Math.sin(phase)) : Math.sin(phase)
    const env = Math.min(1, t * 3) * Math.min(1, (data.length / sr - t) * 2)
    data[i] = (data[i] ?? 0) + raw * amp * env
  }
}

function fillNoiseBed(data: Float32Array, sr: number, amp: number) {
  let pink = 0
  for (let i = 0; i < data.length; i++) {
    const t = i / sr
    const white = Math.random() * 2 - 1
    pink = pink * 0.92 + white * 0.08
    const env = Math.min(1, t * 2) * Math.min(1, (data.length / sr - t) * 1.5)
    const syllable = 0.4 + 0.6 * Math.max(0, Math.sin(t * Math.PI * 2 * 3))
    data[i] = (data[i] ?? 0) + pink * amp * env * syllable
  }
}

/** Render ~seconds of audible preview offline (no hardware output required). */
export async function renderPreviewBuffer(
  session: CreateSession,
  seconds = 12,
): Promise<AudioBuffer> {
  const track = getTrack(session.soundtrack.trackId)
  let fileBuffer: AudioBuffer | null = null
  if (track?.audioSrc) {
    const probe = new AudioContext()
    try {
      fileBuffer = await loadMoodAudio(probe, track.audioSrc)
    } catch {
      fileBuffer = null
    } finally {
      await probe.close()
    }
  }

  const sr = fileBuffer?.sampleRate ?? 44100
  const len = Math.floor(sr * seconds)
  const OfflineCtx =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext })
      .webkitOfflineAudioContext
  const offline = new OfflineCtx(2, len, sr)

  const master = offline.createGain()
  master.gain.value = Math.max(0.5, session.masterVolume)
  master.connect(offline.destination)

  // Mood bed — prefer decoded MP3 when available (calibrated linear gain)
  const mood = offline.createGain()
  mood.gain.value = session.soundtrack.volume
  mood.connect(master)
  if (fileBuffer) {
    const src = offline.createBufferSource()
    src.buffer = fileBuffer
    src.loop = true
    src.connect(mood)
    src.start(0)
  } else {
    const o1 = offline.createOscillator()
    o1.type = 'sine'
    o1.frequency.value = 110
    const o2 = offline.createOscillator()
    o2.type = 'triangle'
    o2.frequency.value = 165
    const g1 = offline.createGain()
    g1.gain.value = 0.35
    const g2 = offline.createGain()
    g2.gain.value = 0.22
    o1.connect(g1).connect(mood)
    o2.connect(g2).connect(mood)
    o1.start(0)
    o2.start(0)
  }

  // Carrier / entrainment
  const car = offline.createGain()
  car.gain.value = session.frequency.volume * 0.9
  car.connect(master)
  const left = offline.createOscillator()
  left.type = 'sine'
  left.frequency.value = session.frequency.hz
  const right = offline.createOscillator()
  right.type = 'sine'
  right.frequency.value = session.frequency.hz + (session.frequency.beatHz || 6)
  const merge = offline.createChannelMerger(2)
  left.connect(merge, 0, 0)
  right.connect(merge, 0, 1)
  merge.connect(car)
  left.start(0)
  right.start(0)

  // Voice / affirmation bed when narration enabled
  if (session.voice.mode !== 'none' && session.voice.script.trim()) {
    const words = Math.max(1, countWords(session.voice.script))
    const buf = offline.createBuffer(2, len, sr)
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch)
      fillNoiseBed(data, sr, 0.55)
      fillTone(data, sr, 180 + ch * 10, 0.2)
      // Soft cadence from word count
      void words
    }
    const src = offline.createBufferSource()
    src.buffer = buf
    const vg = offline.createGain()
    vg.gain.value = Math.min(1, session.voice.volume) * 0.85
    src.connect(vg).connect(master)
    src.start(0)
  }

  return offline.startRendering()
}

export async function downloadPreviewWav(session: CreateSession, seconds = 12) {
  const buffer = await renderPreviewBuffer(session, seconds)
  const blob = audioBufferToWav(buffer)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `subliminax-preview-${Date.now()}.wav`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
  return blob
}
