/**
 * In-app Feature Guide — what each module is for, how to use it, what to expect.
 */

export interface FeatureGuideEntry {
  id: string
  title: string
  /** Short hub-style line */
  summary: string
  whatFor: string
  howTo: string[]
  expect: string[]
  tips?: string[]
}

export interface FeatureGuideSection {
  id: string
  title: string
  intro: string
  entries: FeatureGuideEntry[]
}

export const FEATURE_GUIDE_SECTIONS: FeatureGuideSection[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    intro:
      'SubliminaX is a psychoacoustic studio. You design a subliminal mix, save it on this device, then play it back with live visuals and tools.',
    entries: [
      {
        id: 'overview',
        title: 'How the studio fits together',
        summary: 'Create → Save → play from Saved Tracks · plus overnight, voyage, and visual modules.',
        whatFor:
          'One place to build frequency + soundtrack + ambient + affirmation mixes, then listen from Saved Tracks.',
        howTo: [
          'Start at Home → Create Subliminal (or Quick Presets for a curated kickoff).',
          'Walk the seven steps; on Mix, preview and tap Complete track.',
          'Open Saved Tracks to Play (corner mini-player), Edit, Share, or Clone.',
          'Use REMscribe for overnight sessions, Ganzfeld for closed-eye flicker, Aurevia for short voyages.',
        ],
        expect: [
          'Mixes stay on this device (browser storage) — they are not uploaded to a cloud library.',
          'Headphones work best for binaural / spatial tools.',
          'First Play may ask for microphone permission only where a module needs it (REMscribe, Focus Shield, voice record).',
        ],
      },
      {
        id: 'listening-basics',
        title: 'Psychoacoustic basics',
        summary: 'Carriers, brainwave beats, masking, and why voice sits quietly.',
        whatFor:
          'Understanding the language of the Mix and Player so Optimal presets and Advanced tools make sense.',
        howTo: [
          'Carrier (e.g. 528 Hz) is the main tone; beat Hz is the difference that entrains brainwave bands.',
          'Binaural needs stereo headphones; monaural / isochronic / pure work on speakers too.',
          'Optimal Manifestation Calibration keeps voice under the music/ambient “mask” so affirmations feel subliminal.',
        ],
        expect: [
          'Delta ~0.5–4 Hz (deep sleep), Theta ~4–8, Alpha ~8–12, Beta ~12–30, Gamma higher.',
          'Schumann ~7.83 Hz is an Earth-reference option on Frequency.',
          'X-Ray shows four buses: music, soundscape, frequency, voice — not a studio parametric EQ.',
        ],
        tips: [
          'If something sounds harsh, lower Frequency and Voice first, then Soundtrack.',
          'Ultrasonic mode raises near-silent carriers — use sparingly and at modest volume.',
        ],
      },
    ],
  },
  {
    id: 'create',
    title: 'Create Subliminal',
    intro:
      'Guided seven-step workflow from intent to a completed mix with optional advanced DSP tools.',
    entries: [
      {
        id: 'create-intent',
        title: 'Step 1 · Intent',
        summary: 'Physical, mental, spiritual, emotional, or custom.',
        whatFor: 'Chooses the issue catalog and sample affirmation direction.',
        howTo: [
          'Pick a category chip, or Custom if you will write your own focus.',
          'Continue when the category feels right — you can still edit later.',
        ],
        expect: ['Issue lists and recommended frequencies change with the category.'],
      },
      {
        id: 'create-issue',
        title: 'Step 2 · Issue',
        summary: 'Specific focus with recommended Hz and sample lines.',
        whatFor: 'Narrows the session to a concrete theme (sleep, confidence, etc.).',
        howTo: [
          'Search or scroll the issue list.',
          'Select one issue — note the recommended Hz and sample affirmations.',
        ],
        expect: ['Frequency and Voice steps will suggest values from this choice.'],
      },
      {
        id: 'create-frequency',
        title: 'Step 3 · Frequency & entrainment',
        summary: 'Carrier Hz, band, binaural/monaural/isochronic/pure, beat.',
        whatFor: 'Sets the tonal and entrainment backbone of the mix.',
        howTo: [
          'Choose a Solfeggio / band chip or type a custom Hz.',
          'Pick entrainment type; set beat Hz for binaural / isochronic.',
          'Optional progressive ramp for night-style descents.',
        ],
        expect: [
          'This Hz also drives Player cymatics later.',
          'Volume here is the Frequency bus — Optimal Mix will rebalance it.',
        ],
      },
      {
        id: 'create-soundtrack',
        title: 'Step 4 · Soundtrack by mood',
        summary:
          'Calming, Energizing, Focusing, Sleeping, Inspiring, Loving — real AUDIO beds when available.',
        whatFor: 'Chooses the musical bed under carriers and voice.',
        howTo: [
          'Pick a mood, then a track tile.',
          'Use the tile ▶ to audition only that bed (no narration / carrier).',
          'When a mood has real MP3 beds, only those AUDIO tiles are listed.',
        ],
        expect: [
          'Energizing, Focusing, Sleeping, Inspiring, and Loving beds stream from Cloudflare R2; Calming can be local.',
          'Synth tiles remain as fallbacks when a mood has no MP3 beds yet.',
        ],
      },
      {
        id: 'create-ambient',
        title: 'Step 5 · Ambient layers',
        summary: 'Rain, drones, room tone, and other beds under the soundtrack.',
        whatFor: 'Adds atmosphere and masking texture.',
        howTo: [
          'Enable layers you want; adjust each gain.',
          'Ambient bus gain on Mix scales all enabled layers together.',
        ],
        expect: ['Too many loud ambients can bury the voice — Optimal Mix accounts for this.'],
      },
      {
        id: 'create-voice',
        title: 'Step 6 · Voice & affirmations',
        summary: 'Narrator, clone, record, or none — plus script and delivery.',
        whatFor: 'The spoken (or silent) affirmation layer.',
        howTo: [
          'Write or generate a script; set rate / pitch / pause.',
          'Choose narrator, local clone profile, mic recording, or none.',
          'Preview delivery before Mix.',
        ],
        expect: [
          'On Mix / Player, voice sits quietly under the mask by default (−32 dB Standard).',
          'Affirmation speed can still be changed live in the Player.',
        ],
      },
      {
        id: 'create-mix',
        title: 'Step 7 · Mix, Optimal, Advanced, Complete',
        summary: 'Balance buses, preview tools, save to Saved Tracks.',
        whatFor: 'Locks levels and optional psychoacoustic chain, then saves the mix.',
        howTo: [
          'Use Optimal Manifestation Calibration (Standard / Sleep / Ultrasonic) or drag bus sliders.',
          'Preview base mix or Preview with tools while adjusting Advanced Engineering.',
          'Tap Complete track — the mix appears in Saved Tracks on this device.',
        ],
        expect: [
          'Ganzfeld is not launched from Create — use Home → Ganzfeld Visual Sync.',
          'X-Ray on Mix shows the four live buses during preview.',
        ],
      },
    ],
  },
  {
    id: 'player-saved',
    title: 'Player & Saved Tracks',
    intro: 'Play completed mixes from Saved Tracks — audio keeps going in a corner mini-player while you browse.',
    entries: [
      {
        id: 'subliminal-player',
        title: 'Corner mini-player',
        summary: 'Compact dock on the lower-right: play, pause, stop, minimize.',
        whatFor: 'Keep a saved mix running in the background without a dedicated player page.',
        howTo: [
          'Home → Saved Tracks → Play on a mix card.',
          'Use the corner player to Pause / Resume / Stop, or minimize it to a pill.',
          'Navigate Home or other hubs — playback continues until you Stop.',
        ],
        expect: [
          'There is no separate player screen; Saved Tracks is the library.',
          'Minimizing only collapses the dock — audio keeps running.',
        ],
      },
      {
        id: 'saved-tracks',
        title: 'Saved Tracks',
        summary: 'Library of completed mixes on this browser.',
        whatFor: 'Play, edit, share, clone, export a short WAV, or delete.',
        howTo: [
          'Open Saved Tracks from Home.',
          'On each card: Play (mini-player), Edit (Create), Share, Clone, Export 12s, or Delete.',
        ],
        expect: [
          'Storage is local to this browser profile (cap applies).',
          'Clearing site data removes saved mixes.',
          'Share uses the device share sheet or copies a text summary.',
        ],
      },
      {
        id: 'quick-presets',
        title: 'Quick Presets',
        summary: 'Jump into Create with curated focus / sleep / calm starts.',
        whatFor: 'Skip blank-canvas decisions when you want a known-good starting point.',
        howTo: ['Home → Quick Presets → pick a card → finish the remaining Create steps.'],
        expect: ['Presets seed frequency/mood/psycho defaults; you can still change everything.'],
      },
    ],
  },
  {
    id: 'advanced',
    title: 'Advanced Audio Engineering',
    intro:
      'Optional DSP tools on Create Mix and in the Player. Each tool has a plain-language description in the UI.',
    entries: [
      {
        id: 'adv-space',
        title: 'Space 3D',
        summary: 'Externalizer, front/behind, proximity, orbit, Haas width.',
        whatFor: 'Place the mix around and outside the head on headphones.',
        howTo: [
          'Open Advanced → Space 3D.',
          'Raise Externalizer for room-like crossfeed; use Front↔Behind and Proximity for depth.',
          'Orbit and Dual Pan / Haas widen or move the scene — start low.',
        ],
        expect: [
          'Each slider should change the spatial image distinctly (not a single buzz).',
          'Best judged on stereo headphones while Preview / Play is running.',
        ],
      },
      {
        id: 'adv-somatic',
        title: 'Body / Somatic',
        summary: 'Felt bass, chest resonance, vestibular, bone-conduction flavor.',
        whatFor: 'Add body-felt weight and ASMR-like proximity cues.',
        howTo: ['Add intensity gradually while previewing; back off if fatigue appears.'],
        expect: ['These color the low end and presence — not a separate “rumble track”.'],
      },
      {
        id: 'adv-breath',
        title: 'Breath & Masking',
        summary: 'Breath sync patterns, envelope mask, optional ultrasonic carrier.',
        whatFor: 'Pace breathing with the mix and keep voice under the conscious mask.',
        howTo: [
          'Enable breath sync / lock patterns (e.g. 4-7-8) for guided pacing.',
          'Envelope mask depth controls how far voice sits under the beds.',
          'Ultrasonic is optional and should stay modest in level.',
        ],
        expect: ['Mask line on X-Ray approximates the conscious hearing floor for voice.'],
      },
      {
        id: 'adv-illusions',
        title: 'Illusions & Trance',
        summary: 'Shepard, missing fundamental, Ottis, chirp, and related tricks.',
        whatFor: 'Deepen trance and masking with classic auditory illusions.',
        howTo: ['Enable one illusion at a time first so you can hear what it does.'],
        expect: ['Some illusions are subtle; use X-Ray and Isolate Voice to verify.'],
      },
      {
        id: 'adv-neuro',
        title: 'Neuro-Illusions',
        summary: 'Hemispheric weave, crossfeed micro-timing, stochastic halo.',
        whatFor: 'Elevation, corridor, and EMDR-like motion cues in the stereo field.',
        howTo: ['Apply lightly during preview; combine carefully with Space 3D.'],
        expect: ['Motion should feel intentional, not noisy static.'],
      },
      {
        id: 'xray',
        title: 'Subliminal X-Ray',
        summary: 'Four-bus spectrum · Isolate Voice · Check Masking.',
        whatFor: 'See music, soundscape, frequency, and voice at once while balancing.',
        howTo: [
          'Run Preview / Play so analysers are live.',
          'Isolate Voice mutes other buses; Check Masking mutes voice to judge the bed alone.',
        ],
        expect: ['Legend colors match the four buses. Live beat Hz is pinned on the plot.'],
      },
    ],
  },
  {
    id: 'modules',
    title: 'Home modules',
    intro: 'Standalone experiences outside the Create wizard.',
    entries: [
      {
        id: 'remscribe',
        title: 'REMscribe',
        summary: 'Overnight entrainment, local acoustic events, optional dream journaling.',
        whatFor: 'Run a multi-hour sleep curve with calming bed, mic sensing, and morning report.',
        howTo: [
          'Choose duration (or custom wake), calming night bed, and dream language.',
          'Leave Web Speech off (default) for fully local nights — tap “Record dream” on the night HUD for MediaRecorder clips.',
          'Opt in to browser Web Speech only if you want short wake-word / transcript bursts (may use vendor cloud).',
          'Begin Night Session — screen dims; end anytime for the morning report.',
        ],
        expect: [
          'Adaptive curve: Descent → Deep Delta → REM waves → Pre-dawn ascent.',
          'Mic analysis for snoring / movement stays local.',
          'Web Speech is opt-in and never continuous overnight — only short gated bursts when enabled.',
        ],
        tips: ['Use headphones at a comfortable low level; keep the phone/laptop charging.'],
      },
      {
        id: 'ganzfeld',
        title: 'Ganzfeld Visual Sync',
        summary: 'Closed-eye photic flicker locked to entrainment phase.',
        whatFor: 'A separate visual entrainment session (not part of Create Mix).',
        howTo: [
          'Home → Ganzfeld Visual Sync → Enter Ganzfeld.',
          'Accept the photosensitivity consent the first time this browser session.',
          'Relax with eyes closed; adjust mode / palette / intensity in the HUD if shown.',
        ],
        expect: [
          'Flicker follows the live psychoacoustic phase clock.',
          'Stop the engine when finished; do not use if you have photosensitive epilepsy.',
        ],
      },
      {
        id: 'aurevia',
        title: 'Aurevia',
        summary: 'Short guided voyages — threshold, crossing, presence, return.',
        whatFor: 'Narrative / contemplative sessions to a higher-self framing.',
        howTo: [
          'Pick a voyage from Home (sky door, dream letter, or listed starts).',
          'Follow on-screen prompts; optional quiet voice / gift / dream modes from launches.',
        ],
        expect: ['Sessions are timed movements, not a full Create mix editor.'],
      },
      {
        id: 'vision',
        title: 'Vision Boards',
        summary: 'Goals, collage boards, countdowns, progress.',
        whatFor: 'Keep manifestation goals visible and linked into morning dream interpretation.',
        howTo: ['Create boards and goals; update progress; REMscribe can read goal titles for dream links.'],
        expect: ['Data is stored locally like Saved Tracks.'],
      },
      {
        id: 'subliminal-study',
        title: 'Subliminal Study',
        summary: 'OCR textbooks · multi-style lessons · age DSP · headphones/speakers.',
        whatFor:
          'Turn notes or scanned pages into age-calibrated study audio with active-recall, rhyme, song, podcast, memory palace, or ELI5 scripts.',
        howTo: [
          'Set language, subject, age, and Headphones vs Speakers.',
          'Paste text or Scan Pages (OCR) to append textbook photos.',
          'Pick a learning style → Generate → play with record / clone / narrator voice.',
          'Toggle conscious vs subliminal listening; save to Saved Tracks when ready.',
        ],
        expect: [
          'Ages ≤12 use High-Alpha 10.5 Hz; 13–24 use SMR 14 Hz (or Gamma 40 Hz); 25+ use Gamma over Alpha.',
          'Headphones = binaural + externalizer; Speakers = mono-safe isochronic + 3 kHz clarity.',
          'Highlights and a 5-question flash quiz appear above the script.',
        ],
      },
      {
        id: 'account-hub',
        title: 'Account & Neuro-Profile Hub',
        summary: 'Avatar menu · voice vault · listening history · Matrix Cards · billing.',
        whatFor:
          'Your profile, Master Voice Clone sample, listening telemetry, saved Matrix Cards, hardware defaults, and plan limits — all from the top-right avatar.',
        howTo: [
          'Tap the avatar on Home for a quick summary (handle, plan, listening hours).',
          'Open Account Hub → Profile & Voice to crop an avatar and record a 48 kHz PCM WAV calibration (~30s script).',
          'Progress shows Vision Board momentum, mode hours, and searchable track history.',
          'Neuro-Defaults sets Headphones/Speakers, Optimal Mix Calibration, REMscribe language, and Ganzfeld consent.',
          'Subscription shows tier limits and Upgrade / Manage Billing.',
        ],
        expect: [
          'Master voice sample is shared with Studio (Create), Subliminal Study, and REMscribe via userVoiceSampleUrl.',
          'Profile and preferences persist in this browser; voice WAV is stored in IndexedDB.',
          'Billing UI is a local demo until Stripe (or similar) is connected.',
        ],
        tips: [
          'Re-record the Master Voice Clone anytime; older blob URLs are revoked automatically.',
          'Ganzfeld consent saved here skips the session safety modal on later launches.',
        ],
      },
      {
        id: 'aura-calibration',
        title: 'Aura Calibration',
        summary: 'Kinetic drawing · 3 words · brainwave prescription card.',
        whatFor:
          'A somatic-intuition diagnostic: draw for 10–20s, capture velocity/curvature/hesitation, then map motion + words into a personalized frequency prescription.',
        howTo: [
          'Home → Aura Calibration → draw freely on the dark glass canvas (min 10s).',
          'Finish → enter the first 3 words that arrive → Read my Aura.',
          'Generate Track Now opens Studio preloaded with carrier/beat, spatial, breath, and a script from your words.',
          'Save Frequency Preset keeps the prescription locally for later.',
        ],
        expect: [
          'Fast/jagged → Alpha + 4-7-8; slow/heavy → SMR or Gamma; flowing → Theta.',
          'Particle trails react to pointer velocity in real time.',
        ],
      },
      {
        id: 'sonic-dna',
        title: 'Sonic DNA',
        summary: 'Ultrasonic FSK watermark · 15s scanner · Matrix Card extract.',
        whatFor:
          'Authenticate Subliminax engine tracks and copy DSP architecture without ever exposing private affirmations.',
        howTo: [
          'Play any Subliminax session — PsychoacousticEngine embeds a repeating 10s FSK burst at 18.2–19.4 kHz (−36 dBFS).',
          'Home → Sonic DNA → Scan Track (15s) with the mic, upload a file, or Self-check decode.',
          'On success: verified badge + Matrix Card (frequencies, spatial, somatic, breath) with Affirmation Layer locked.',
          'Apply Configuration to My Studio loads those DSP settings with voice left empty for your own script.',
        ],
        expect: [
          'Payload carries SMX_V1 + checksum — never voice/affirmation text.',
          'Decoded cards also appear under Account Hub → Matrix Cards (Sonic DNA).',
          'Many laptop mics attenuate ultrasonics; file upload / Self-check is most reliable.',
        ],
      },
    ],
  },
]

export function allGuideEntries(): FeatureGuideEntry[] {
  return FEATURE_GUIDE_SECTIONS.flatMap((s) => s.entries)
}
