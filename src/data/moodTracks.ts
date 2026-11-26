import type { MoodCategory, MoodTrackDef } from '../types/studio'

/** Cloudflare R2 public base for HQ soundtrack beds */
export const R2_MUSIC_BASE =
  'https://pub-59ff490146264a67852157b156174a93.r2.dev'

export const MOOD_LABELS: Record<MoodCategory, string> = {
  calming: 'Calming',
  energizing: 'Energizing',
  inspiring: 'Inspiring',
  focusing: 'Focusing',
  sleeping: 'Sleeping',
  loving: 'Loving',
}

export const MOOD_TRACKS: MoodTrackDef[] = [
  // Calming — real audio beds (local)
  {
    id: 'tranquility',
    mood: 'calming',
    name: 'Tranquility',
    blurb: 'Full audio bed · calm atmospheric music',
    profile: 'warm-pad-slow',
    audioSrc: '/audio/mood/calming/tranquility.mp3',
  },
  {
    id: 'tranquil-stillness',
    mood: 'calming',
    name: 'Tranquil Stillness',
    blurb: 'Full audio bed · still, spacious calm',
    profile: 'liquid-arp',
    audioSrc: '/audio/mood/calming/tranquil-stillness.mp3',
  },
  {
    id: 'deep-calm-2',
    mood: 'calming',
    name: 'Deep Calm 2',
    blurb: 'Full audio bed · deep restorative calm',
    profile: 'warm-fifths',
    audioSrc: '/audio/mood/calming/deep-calm-2.mp3',
  },
  {
    id: 'deep-calm',
    mood: 'calming',
    name: 'Deep Calm',
    blurb: 'Full audio bed · soft deep calm',
    profile: 'pluck-pad',
    audioSrc: '/audio/mood/calming/deep-calm.mp3',
  },
  // Calming — procedural synths
  {
    id: 'velvet-horizon',
    mood: 'calming',
    name: 'Velvet Horizon',
    blurb: 'Synth · slow warm pads & gentle low-pass drift',
    profile: 'warm-pad-slow',
  },
  {
    id: 'still-waters-drift',
    mood: 'calming',
    name: 'Still Waters Drift',
    blurb: 'Synth · soft liquid arpeggios & slow breathy chords',
    profile: 'liquid-arp',
  },
  {
    id: 'amber-dusk-sanctuary',
    mood: 'calming',
    name: 'Amber Dusk Sanctuary',
    blurb: 'Synth · warm fifths & tranquil release',
    profile: 'warm-fifths',
  },
  {
    id: 'quiet-meadow-pulse',
    mood: 'calming',
    name: 'Quiet Meadow Pulse',
    blurb: 'Synth · soft plucked tones & serene pad',
    profile: 'pluck-pad',
  },
  {
    id: 'soft-breath-tide',
    mood: 'calming',
    name: 'Soft Breath Tide',
    blurb: 'Synth · slow swelling harmonic wash',
    profile: 'swell-wash',
  },
  // Energizing — real audio beds (HQ on Cloudflare R2)
  {
    id: 'energizing-morning',
    mood: 'energizing',
    name: 'Energizing Morning',
    blurb: 'Full audio bed · bright morning lift',
    profile: 'bright-pulse',
    audioSrc: `${R2_MUSIC_BASE}/energizing/Energizing%20Morning.mp3`,
  },
  {
    id: 'high-vibration-strings',
    mood: 'energizing',
    name: 'High Vibration Strings',
    blurb: 'Full audio bed · lively string energy',
    profile: 'drive-seq',
    audioSrc: `${R2_MUSIC_BASE}/energizing/High%20Vibration%20Strings%201.mp3`,
  },
  {
    id: 'morning-sun-vitality-1',
    mood: 'energizing',
    name: 'Morning Sun Vitality 1',
    blurb: 'Full audio bed · sunlit vitality',
    profile: 'filter-surge',
    audioSrc: `${R2_MUSIC_BASE}/energizing/Morning%20Sun%20Vitality%201.mp3`,
  },
  {
    id: 'morning-sun-vitality-2',
    mood: 'energizing',
    name: 'Morning Sun Vitality 2',
    blurb: 'Full audio bed · second sunlit vitality bed',
    profile: 'upbeat-pulse',
    audioSrc: `${R2_MUSIC_BASE}/energizing/Morning%20Sun%20Vitality%202.mp3`,
  },
  {
    id: 'rising-warmth-kundalini',
    mood: 'energizing',
    name: 'Rising Warmth Kundalini',
    blurb: 'Full audio bed · rising warmth & activation',
    profile: 'sparkle-arp',
    audioSrc: `${R2_MUSIC_BASE}/energizing/Rising%20Warmth%20Kundalini.mp3`,
  },
  {
    id: 'warm-shimmer',
    mood: 'energizing',
    name: 'Warm Shimmer',
    blurb: 'Full audio bed · warm shimmering energy',
    profile: 'bright-pulse',
    audioSrc: `${R2_MUSIC_BASE}/energizing/Warm%20Shimmer.mp3`,
  },
  // Energizing — procedural synths
  {
    id: 'solar-ignition',
    mood: 'energizing',
    name: 'Solar Ignition',
    blurb: 'Synth · bright rhythmic pulse & uplifting majors',
    profile: 'bright-pulse',
  },
  {
    id: 'kinetic-dawn',
    mood: 'energizing',
    name: 'Kinetic Dawn',
    blurb: 'Synth · driving tempo sequence & crisp lift',
    profile: 'drive-seq',
  },
  {
    id: 'vibrant-surge',
    mood: 'energizing',
    name: 'Vibrant Surge',
    blurb: 'Synth · energetic filter sweep & chord steps',
    profile: 'filter-surge',
  },
  {
    id: 'turbo-clarity',
    mood: 'energizing',
    name: 'Turbo Clarity',
    blurb: 'Synth · upbeat pulse & brisk momentum',
    profile: 'upbeat-pulse',
  },
  {
    id: 'radiant-momentum',
    mood: 'energizing',
    name: 'Radiant Momentum',
    blurb: 'Synth · sparkling arpeggio lift & steady drive',
    profile: 'sparkle-arp',
  },
  // Focusing — R2
  {
    id: 'deep-focus',
    mood: 'focusing',
    name: 'Deep Focus',
    blurb: 'Full audio bed · deep concentration bed',
    profile: 'flow-grid',
    audioSrc: `${R2_MUSIC_BASE}/focus/Deep%20Focus.mp3`,
  },
  {
    id: 'focus-flow',
    mood: 'focusing',
    name: 'Focus Flow',
    blurb: 'Full audio bed · steady focus flow',
    profile: 'minimal-fifths',
    audioSrc: `${R2_MUSIC_BASE}/focus/Focus%20Flow.mp3`,
  },
  {
    id: 'focused-flow',
    mood: 'focusing',
    name: 'Focused Flow',
    blurb: 'Full audio bed · locked-in flow state',
    profile: 'drone-tick',
    audioSrc: `${R2_MUSIC_BASE}/focus/Focused%20Flow.mp3`,
  },
  {
    id: 'pulse-and-drone',
    mood: 'focusing',
    name: 'Pulse and Drone',
    blurb: 'Full audio bed · pulse with grounding drone',
    profile: 'anchor-cadence',
    audioSrc: `${R2_MUSIC_BASE}/focus/Pulse%20and%20Drone.mp3`,
  },
  // Focusing — procedural synths
  {
    id: 'deep-flow-grid',
    mood: 'focusing',
    name: 'Deep Flow Grid',
    blurb: 'Synth · steady non-distracting pulse & clean low-mid pad',
    profile: 'flow-grid',
  },
  {
    id: 'laser-syntax',
    mood: 'focusing',
    name: 'Laser Syntax',
    blurb: 'Synth · minimalist repeating fifths & calm clarity',
    profile: 'minimal-fifths',
  },
  {
    id: 'monolith-calm',
    mood: 'focusing',
    name: 'Monolith Calm',
    blurb: 'Synth · grounded drone & subtle metronomic shimmer',
    profile: 'drone-tick',
  },
  {
    id: 'cognitive-anchor',
    mood: 'focusing',
    name: 'Cognitive Anchor',
    blurb: 'Synth · clean steady cadence & low-clutter harmonics',
    profile: 'anchor-cadence',
  },
  {
    id: 'zero-drift',
    mood: 'focusing',
    name: 'Zero Drift',
    blurb: 'Synth · smooth continuous harmonic bed for concentration',
    profile: 'steady-bed',
  },
  // Sleeping — R2
  {
    id: 'gentle-flute',
    mood: 'sleeping',
    name: 'Gentle Flute',
    blurb: 'Full audio bed · soft flute for rest',
    profile: 'sub-pad',
    audioSrc: `${R2_MUSIC_BASE}/sleep/Gentle%20Flute.mp3`,
  },
  {
    id: 'natures-song',
    mood: 'sleeping',
    name: "Nature's Song",
    blurb: 'Full audio bed · gentle nature overnight',
    profile: 'drowsy-wash',
    audioSrc: `${R2_MUSIC_BASE}/sleep/Nature%27s%20Song.mp3`,
  },
  {
    id: 'quiet-night-woodland',
    mood: 'sleeping',
    name: 'Quiet Night Woodland',
    blurb: 'Full audio bed · quiet woodland night',
    profile: 'rock-swell',
    audioSrc: `${R2_MUSIC_BASE}/sleep/Quiet%20Night%20Woodland.mp3`,
  },
  {
    id: 'soft-bamboo-flute',
    mood: 'sleeping',
    name: 'Soft Bamboo Flute',
    blurb: 'Full audio bed · soft bamboo flute dusk',
    profile: 'lullaby-bell',
    audioSrc: `${R2_MUSIC_BASE}/sleep/Soft%20Bamboo%20Flute.mp3`,
  },
  // Sleeping — procedural synths
  {
    id: 'midnight-submersion',
    mood: 'sleeping',
    name: 'Midnight Submersion',
    blurb: 'Synth · ultra-slow deep sub-bass pad & gentle roll-off',
    profile: 'sub-pad',
  },
  {
    id: 'lunar-slumber',
    mood: 'sleeping',
    name: 'Lunar Slumber',
    blurb: 'Synth · soft drifting seventh/ninth wash & drowsy tempo',
    profile: 'drowsy-wash',
  },
  {
    id: 'deep-delta-cradle',
    mood: 'sleeping',
    name: 'Deep Delta Cradle',
    blurb: 'Synth · slow rocking harmonic swells & dark warmth',
    profile: 'rock-swell',
  },
  {
    id: 'starlight-lullaby',
    mood: 'sleeping',
    name: 'Starlight Lullaby',
    blurb: 'Synth · delicate high-cut bell drops & tranquil drone',
    profile: 'lullaby-bell',
  },
  {
    id: 'dreamless-drift',
    mood: 'sleeping',
    name: 'Dreamless Drift',
    blurb: 'Synth · minimalist ultra-calm low-frequency fade',
    profile: 'dreamless',
  },
  // Inspiring — R2
  {
    id: 'blooming-arpeggios',
    mood: 'inspiring',
    name: 'Blooming Arpeggios',
    blurb: 'Full audio bed · blooming arpeggio lift',
    profile: 'soar-fifths',
    audioSrc: `${R2_MUSIC_BASE}/inspire/Blooming%20Arpeggios.mp3`,
  },
  {
    id: 'forward-motion',
    mood: 'inspiring',
    name: 'Forward Motion',
    blurb: 'Full audio bed · forward hopeful motion',
    profile: 'hope-prog',
    audioSrc: `${R2_MUSIC_BASE}/inspire/Forward%20Motion.mp3`,
  },
  {
    id: 'luminous-peak',
    mood: 'inspiring',
    name: 'Luminous Peak',
    blurb: 'Full audio bed · luminous peak swell',
    profile: 'bell-wide',
    audioSrc: `${R2_MUSIC_BASE}/inspire/Luminous%20Peak.mp3`,
  },
  {
    id: 'morning-light-swells',
    mood: 'inspiring',
    name: 'Morning Light Swells',
    blurb: 'Full audio bed · morning light swells',
    profile: 'bright-sweep',
    audioSrc: `${R2_MUSIC_BASE}/inspire/Morning%20Light%20Swells.mp3`,
  },
  // Inspiring — procedural synths
  {
    id: 'ascension-chords',
    mood: 'inspiring',
    name: 'Ascension Chords',
    blurb: 'Synth · soaring open fifths & expansive pad swells',
    profile: 'soar-fifths',
  },
  {
    id: 'golden-horizon',
    mood: 'inspiring',
    name: 'Golden Horizon',
    blurb: 'Synth · hopeful harmonic progression & warm shimmer',
    profile: 'hope-prog',
  },
  {
    id: 'awakened-vision',
    mood: 'inspiring',
    name: 'Awakened Vision',
    blurb: 'Synth · wide stereo bell-like tones & uplifting lift',
    profile: 'bell-wide',
  },
  {
    id: 'skyward-breakthrough',
    mood: 'inspiring',
    name: 'Skyward Breakthrough',
    blurb: 'Synth · brightening intervals & transcendent sweep',
    profile: 'bright-sweep',
  },
  {
    id: 'inner-compass',
    mood: 'inspiring',
    name: 'Inner Compass',
    blurb: 'Synth · steady guiding harmonic melody & warm aura',
    profile: 'guide-melody',
  },
  // Loving — R2 (new mood)
  {
    id: 'intimate-flow',
    mood: 'loving',
    name: 'Intimate Flow',
    blurb: 'Full audio bed · intimate heart-centered flow',
    profile: 'warm-pad-slow',
    audioSrc: `${R2_MUSIC_BASE}/love/Intimate%20Flow.mp3`,
  },
  {
    id: 'love-violins',
    mood: 'loving',
    name: 'Love Violins',
    blurb: 'Full audio bed · tender violin warmth',
    profile: 'warm-fifths',
    audioSrc: `${R2_MUSIC_BASE}/love/Love%20Violins.mp3`,
  },
  {
    id: 'tender-pulse',
    mood: 'loving',
    name: 'Tender Pulse',
    blurb: 'Full audio bed · soft tender pulse',
    profile: 'pluck-pad',
    audioSrc: `${R2_MUSIC_BASE}/love/Tender%20Pulse.mp3`,
  },
  {
    id: 'warm-piano-motif',
    mood: 'loving',
    name: 'Warm Piano Motif',
    blurb: 'Full audio bed · warm piano motif',
    profile: 'hope-prog',
    audioSrc: `${R2_MUSIC_BASE}/love/Warm%20Piano%20Motif.mp3`,
  },
]

/** Tracks for a mood. When real AUDIO beds exist, hide leftover synth beds for that mood. */
export function tracksForMood(mood: MoodCategory) {
  const forMood = MOOD_TRACKS.filter((t) => t.mood === mood)
  const audioBeds = forMood.filter((t) => t.audioSrc)
  return audioBeds.length > 0 ? audioBeds : forMood
}

export function getTrack(id: string) {
  return MOOD_TRACKS.find((t) => t.id === id) ?? null
}
