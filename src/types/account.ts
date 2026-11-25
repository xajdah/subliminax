/** User Account & Neuro-Profile Hub types */

import type { ManifestationMode } from '../audio/manifestationCalibration'
import type { DreamLanguageCode } from './remscribe'
import type { StudyOutputDevice } from './study'

export type PlanTier = 'free' | 'pro' | 'studio'

export interface AccountProfile {
  username: string
  displayName: string
  /** data URL (cropped avatar preview) */
  avatarDataUrl: string | null
  /** Object URL or data URL for master voice clone WAV */
  userVoiceSampleUrl: string | null
  voiceSampleCalibratedAt: number | null
  voiceSampleDurationSec: number | null
}

export interface AccountPreferences {
  outputDevice: StudyOutputDevice
  manifestationMode: ManifestationMode
  remscribeLanguage: DreamLanguageCode
  /** Persistent Ganzfeld photosensitivity consent */
  ganzfeldSafetyConsent: boolean
}

export interface ListeningModeHours {
  manifestation: number
  remscribe: number
  focusShield: number
  study: number
}

export type ListeningCategory =
  | 'manifestation'
  | 'remscribe'
  | 'focusShield'
  | 'study'
  | 'other'

export interface TrackListenRecord {
  id: string
  trackTitle: string
  category: ListeningCategory
  totalSeconds: number
  lastSessionAt: number
  /** Optional saved mix id for Play */
  mixId?: string
}

export interface MatrixCard {
  id: string
  title: string
  blurb: string
  accent: string
  createdAt: number
  source: 'manual' | 'sonicDna' | 'savedMix'
  mixId?: string
}

export interface SubscriptionInfo {
  tier: PlanTier
  renewalAt: number | null
  voiceCloneSlots: number
  voiceCloneUsed: number
  aiGenerationsPerMonth: number
  aiGenerationsUsed: number
  cloudTrackMb: number
  cloudTrackUsedMb: number
}

export interface AccountStore {
  version: 1
  profile: AccountProfile
  preferences: AccountPreferences
  modeHours: ListeningModeHours
  trackHistory: TrackListenRecord[]
  matrixCards: MatrixCard[]
  subscription: SubscriptionInfo
  /** Consecutive calendar days with any listen activity */
  dailyStreak: number
  lastActiveDay: string | null
}

export const PLAN_LABELS: Record<PlanTier, string> = {
  free: 'Free',
  pro: 'Pro',
  studio: 'Studio',
}

export const VOICE_CALIBRATION_SCRIPT =
  'The blue sky brightens over quiet hills. Five lively foxes dash past. My voice stays clear, calm, and steady — one two three four five — while soft vowels open: ah eh ee oh oo. Remember this tone for Subliminax.'

export function createDefaultAccountStore(): AccountStore {
  return {
    version: 1,
    profile: {
      username: 'seeker',
      displayName: 'SubliminaX Seeker',
      avatarDataUrl: null,
      userVoiceSampleUrl: null,
      voiceSampleCalibratedAt: null,
      voiceSampleDurationSec: null,
    },
    preferences: {
      outputDevice: 'headphones',
      manifestationMode: 'standard',
      remscribeLanguage: 'en-US',
      ganzfeldSafetyConsent: false,
    },
    modeHours: {
      manifestation: 0,
      remscribe: 0,
      focusShield: 0,
      study: 0,
    },
    trackHistory: [],
    matrixCards: [],
    subscription: {
      tier: 'free',
      renewalAt: null,
      voiceCloneSlots: 1,
      voiceCloneUsed: 0,
      aiGenerationsPerMonth: 20,
      aiGenerationsUsed: 0,
      cloudTrackMb: 100,
      cloudTrackUsedMb: 0,
    },
    dailyStreak: 0,
    lastActiveDay: null,
  }
}

export function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`
  return `${hours.toFixed(1)}h`
}

export function totalListeningHours(mode: ListeningModeHours): number {
  return mode.manifestation + mode.remscribe + mode.focusShield + mode.study
}
