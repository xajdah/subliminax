/** Apply decoded Sonic DNA payload into a CreateSession (voice stays empty / private). */

import { payloadFromPsycho, type SonicDnaPayload } from '../types/sonicDna'
import type { CreateSession } from '../types/studio'
import { createDefaultSession } from '../types/studio'
import { DEFAULT_PSYCHO } from '../types/psychoacoustic'
import { accountStorage } from './accountStorage'

export function sessionFromSonicDna(payload: SonicDnaPayload): CreateSession {
  const base = createDefaultSession()
  const band =
    payload.beatHz <= 4
      ? 'delta'
      : payload.beatHz <= 8
        ? 'theta'
        : payload.beatHz <= 12
          ? 'alpha'
          : payload.beatHz <= 30
            ? 'beta'
            : 'gamma'

  const envelopeMaskDb =
    payload.maskingMode === 'deep' ? -24 : payload.maskingMode === 'light' ? -12 : -18

  const psycho = structuredClone(DEFAULT_PSYCHO)
  psycho.frequency = {
    mode:
      payload.entrainmentType === 'isochronic'
        ? 'isochronic'
        : payload.entrainmentType === 'monaural'
          ? 'monaural'
          : payload.entrainmentType === 'pure'
            ? 'solfeggio'
            : payload.entrainmentType === 'off'
              ? 'off'
              : 'binaural',
    carrierHz: payload.carrierHz,
    beatHz: payload.beatHz,
    solfeggioHz: 528,
  }
  psycho.breath = {
    ...psycho.breath,
    breathPattern: payload.breathPattern,
    envelopeMaskDb,
    breathSync: 0.45,
  }
  psycho.somatic = {
    chestBass: payload.somaticLevel * 0.7,
    phantomFundamental: payload.somaticLevel * 0.45,
    cranialPulse: payload.somaticLevel * 0.55,
    asmrWhisper: payload.somaticLevel * 0.4,
  }
  if (payload.spatialMode === 'hrtf') {
    psycho.spatial = {
      ...psycho.spatial,
      externalizer: 0.8,
      orbitSpeed: 0.1,
      dualPan: 0.45,
    }
  } else if (payload.spatialMode === 'bilateral') {
    psycho.spatial = { ...psycho.spatial, dualPan: 0.6, externalizer: 0.3 }
  }

  return {
    ...base,
    step: 'mix',
    category: 'mental',
    frequency: {
      ...base.frequency,
      entrainment: payload.entrainmentType === 'pure' ? 'pure' : payload.entrainmentType,
      band,
      beatHz: payload.beatHz,
      // Solfeggio / tone field — prefer a nearby sacred tone; binaural carrier lives in advancedPsycho
      hz: [174, 285, 396, 417, 432, 528, 639, 741, 852, 963].reduce((best, hz) =>
        Math.abs(hz - payload.carrierHz) < Math.abs(best - payload.carrierHz) ? hz : best,
      528),
    },
    voice: {
      ...base.voice,
      mode: 'none',
      script: '', // Affirmation layer stays private / masked
    },
    psycho: {
      ...base.psycho,
      spatial: payload.spatialMode,
    },
    advancedPsycho: psycho,
  }
}

export function saveSonicDnaMatrixCard(payload: SonicDnaPayload, title?: string) {
  accountStorage.upsertMatrixCard({
    id: `dna_${Date.now().toString(36)}`,
    title: title ?? `Sonic DNA · ${payload.beatHz} Hz`,
    blurb: `${payload.entrainmentType} · ${payload.carrierHz} Hz carrier · ${payload.spatialMode} · somatic ${Math.round(payload.somaticLevel * 100)}%`,
    accent: '#22d3ee',
    createdAt: Date.now(),
    source: 'sonicDna',
  })
}

export function payloadFromSession(session: CreateSession): SonicDnaPayload {
  const s = session.advancedPsycho
  const somaticAvg =
    (s.somatic.chestBass +
      s.somatic.phantomFundamental +
      s.somatic.cranialPulse +
      s.somatic.asmrWhisper) /
    4
  return payloadFromPsycho({
    carrierHz: s.frequency.carrierHz || 200,
    beatHz: session.frequency.beatHz || s.frequency.beatHz,
    entrainmentType: session.frequency.entrainment,
    spatialMode: session.psycho.spatial,
    somaticLevel: somaticAvg,
    breathPattern: s.breath.breathPattern,
    envelopeMaskDb: s.breath.envelopeMaskDb,
  })
}
