import type { MoodCategory, MoodTrackDef } from '../types/studio'

export const MOOD_LABELS: Record<MoodCategory, string> = {
  calming: 'Calming',
  energizing: 'Energizing',
  inspiring: 'Inspiring',
  focusing: 'Focusing',
  sleeping: 'Sleeping',
}

export const MOOD_TRACKS: MoodTrackDef[] = [
  // Calming
  {
    id: 'velvet-horizon',
    mood: 'calming',
    name: 'Velvet Horizon',
    blurb: 'Slow warm pads & gentle low-pass drift',
    profile: 'warm-pad-slow',
  },
  {
    id: 'still-waters-drift',
    mood: 'calming',
    name: 'Still Waters Drift',
    blurb: 'Soft liquid arpeggios & slow breathy chords',
    profile: 'liquid-arp',
  },
  {
    id: 'amber-dusk-sanctuary',
    mood: 'calming',
    name: 'Amber Dusk Sanctuary',
    blurb: 'Warm fifths & tranquil release',
    profile: 'warm-fifths',
  },
  {
    id: 'quiet-meadow-pulse',
    mood: 'calming',
    name: 'Quiet Meadow Pulse',
    blurb: 'Soft plucked tones & serene pad',
    profile: 'pluck-pad',
  },
  {
    id: 'soft-breath-tide',
    mood: 'calming',
    name: 'Soft Breath Tide',
    blurb: 'Slow swelling harmonic wash',
    profile: 'swell-wash',
  },
  // Energizing
  {
    id: 'solar-ignition',
    mood: 'energizing',
    name: 'Solar Ignition',
    blurb: 'Bright rhythmic synth pulse & uplifting majors',
    profile: 'bright-pulse',
  },
  {
    id: 'kinetic-dawn',
    mood: 'energizing',
    name: 'Kinetic Dawn',
    blurb: 'Driving tempo sequence & crisp harmonic lift',
    profile: 'drive-seq',
  },
  {
    id: 'vibrant-surge',
    mood: 'energizing',
    name: 'Vibrant Surge',
    blurb: 'Energetic filter sweep & lively chord steps',
    profile: 'filter-surge',
  },
  {
    id: 'turbo-clarity',
    mood: 'energizing',
    name: 'Turbo Clarity',
    blurb: 'Upbeat pulse & brisk forward momentum',
    profile: 'upbeat-pulse',
  },
  {
    id: 'radiant-momentum',
    mood: 'energizing',
    name: 'Radiant Momentum',
    blurb: 'Sparkling arpeggio lift & steady drive',
    profile: 'sparkle-arp',
  },
  // Inspiring
  {
    id: 'ascension-chords',
    mood: 'inspiring',
    name: 'Ascension Chords',
    blurb: 'Soaring open fifths & expansive pad swells',
    profile: 'soar-fifths',
  },
  {
    id: 'golden-horizon',
    mood: 'inspiring',
    name: 'Golden Horizon',
    blurb: 'Hopeful harmonic progression & warm shimmer',
    profile: 'hope-prog',
  },
  {
    id: 'awakened-vision',
    mood: 'inspiring',
    name: 'Awakened Vision',
    blurb: 'Wide stereo bell-like tones & uplifting lift',
    profile: 'bell-wide',
  },
  {
    id: 'skyward-breakthrough',
    mood: 'inspiring',
    name: 'Skyward Breakthrough',
    blurb: 'Brightening intervals & transcendent sweep',
    profile: 'bright-sweep',
  },
  {
    id: 'inner-compass',
    mood: 'inspiring',
    name: 'Inner Compass',
    blurb: 'Steady guiding harmonic melody & warm aura',
    profile: 'guide-melody',
  },
  // Focusing
  {
    id: 'deep-flow-grid',
    mood: 'focusing',
    name: 'Deep Flow Grid',
    blurb: 'Steady non-distracting pulse & clean low-mid pad',
    profile: 'flow-grid',
  },
  {
    id: 'laser-syntax',
    mood: 'focusing',
    name: 'Laser Syntax',
    blurb: 'Minimalist repeating fifths & calm clarity',
    profile: 'minimal-fifths',
  },
  {
    id: 'monolith-calm',
    mood: 'focusing',
    name: 'Monolith Calm',
    blurb: 'Grounded drone & subtle metronomic shimmer',
    profile: 'drone-tick',
  },
  {
    id: 'cognitive-anchor',
    mood: 'focusing',
    name: 'Cognitive Anchor',
    blurb: 'Clean steady cadence & low-clutter harmonics',
    profile: 'anchor-cadence',
  },
  {
    id: 'zero-drift',
    mood: 'focusing',
    name: 'Zero Drift',
    blurb: 'Smooth continuous harmonic bed for concentration',
    profile: 'steady-bed',
  },
  // Sleeping
  {
    id: 'midnight-submersion',
    mood: 'sleeping',
    name: 'Midnight Submersion',
    blurb: 'Ultra-slow deep sub-bass pad & gentle roll-off',
    profile: 'sub-pad',
  },
  {
    id: 'lunar-slumber',
    mood: 'sleeping',
    name: 'Lunar Slumber',
    blurb: 'Soft drifting seventh/ninth wash & drowsy tempo',
    profile: 'drowsy-wash',
  },
  {
    id: 'deep-delta-cradle',
    mood: 'sleeping',
    name: 'Deep Delta Cradle',
    blurb: 'Slow rocking harmonic swells & dark warmth',
    profile: 'rock-swell',
  },
  {
    id: 'starlight-lullaby',
    mood: 'sleeping',
    name: 'Starlight Lullaby',
    blurb: 'Delicate high-cut bell drops & tranquil drone',
    profile: 'lullaby-bell',
  },
  {
    id: 'dreamless-drift',
    mood: 'sleeping',
    name: 'Dreamless Drift',
    blurb: 'Minimalist ultra-calm low-frequency fade',
    profile: 'dreamless',
  },
]

export function tracksForMood(mood: MoodCategory) {
  return MOOD_TRACKS.filter((t) => t.mood === mood)
}

export function getTrack(id: string) {
  return MOOD_TRACKS.find((t) => t.id === id) ?? null
}
