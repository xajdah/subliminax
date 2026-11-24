import type { IntentCategory, IssueDef } from '../types/studio'

function i(
  category: Exclude<IntentCategory, 'custom'>,
  id: string,
  label: string,
  hz: number[],
  band: IssueDef['recommendedBand'],
  lines: string[],
  description = '',
): IssueDef {
  return {
    id,
    category,
    label,
    description: description || `${label} — guided subliminal draft`,
    recommendedHz: hz,
    recommendedBand: band,
    sampleAffirmations: lines,
  }
}

export const ISSUES: IssueDef[] = [
  // Physical
  i('physical', 'pain-inflammation', 'Pain & Inflammation Relief', [174, 285], 'delta', [
    'My body softens and releases tension.',
    'Comfort returns to every cell.',
  ]),
  i('physical', 'bone-density', 'Bone Density & Structural Repair', [285, 174], 'delta', [
    'My structure grows strong and resilient.',
  ]),
  i('physical', 'tissue-regen', 'Tissue & Cellular Regeneration', [285, 528], 'theta', [
    'Every cell renews with ease.',
  ]),
  i('physical', 'beautification', 'Beautification & Facial Symmetry', [528, 639], 'alpha', [
    'I radiate natural beauty and balance.',
  ]),
  i('physical', 'skin-glow', 'Skin Illumination & Glow', [528, 639], 'alpha', [
    'My skin clears, glows, and renews.',
  ]),
  i('physical', 'acne-clear', 'Acne & Blemish Clearing', [528, 174], 'theta', [
    'My skin heals and clears naturally.',
  ]),
  i('physical', 'hair-regrowth', 'Hair Regrowth & Follicle Vitality', [528, 285], 'theta', [
    'My follicles thrive with vitality.',
    'Healthy hair grows with ease.',
  ]),
  i('physical', 'weight-loss', 'Weight Loss & Fat Metabolism', [528, 396], 'alpha', [
    'My body metabolizes with ease and balance.',
  ]),
  i('physical', 'weight-gain', 'Weight Gain & Healthy Mass Building', [174, 285], 'theta', [
    'I build healthy strength with care.',
  ]),
  i('physical', 'deep-sleep', 'Deep Sleep & Physical Restoration', [174, 285], 'delta', [
    'My body restores deeply as I sleep.',
  ]),
  i('physical', 'immune-boost', 'Immune System & Vitality Boost', [528, 639], 'alpha', [
    'My vitality rises; my defenses are strong.',
  ]),
  i('physical', 'hormonal-balance', 'Hormonal & Nervous System Balance', [528, 396], 'theta', [
    'My systems find calm, steady balance.',
  ]),
  i('physical', 'digestive', 'Digestive & Gut Harmony', [174, 417], 'theta', [
    'My digestion is calm and harmonious.',
  ]),
  i('physical', 'cardio-flow', 'Cardiovascular & Circulation Flow', [528, 639], 'alpha', [
    'Circulation flows freely through me.',
  ]),
  i('physical', 'respiratory', 'Respiratory & Breath Ease', [417, 528], 'alpha', [
    'My breath is easy, full, and free.',
  ]),
  i('physical', 'sensory-clarity', 'Sensory, Vision & Auditory Clarity', [852, 741], 'alpha', [
    'My senses are clear and bright.',
  ]),
  i('physical', 'athletic-recovery', 'Athletic Recovery & Flexibility', [285, 528], 'theta', [
    'My body recovers quickly and flexibly.',
  ]),
  i('physical', 'pre-sleep', 'Pre-Sleep Wind-Down & Tension Release', [174, 396], 'delta', [
    'I release the day and settle into rest.',
  ]),

  // Mental
  i('mental', 'deep-focus', 'Deep Focus & Flow State', [40, 528], 'beta', [
    'My mind enters clear, focused flow.',
  ]),
  i('mental', 'memory-learn', 'Memory, Learning & Neuroplasticity', [40, 852], 'gamma', [
    'I learn easily; my mind stays flexible.',
  ]),
  i('mental', 'anxiety-overthink', 'Anxiety & Overthinking Relief', [396, 432], 'alpha', [
    'Thoughts settle; calm clarity remains.',
  ]),
  i('mental', 'stress-burnout', 'Stress & Burnout Recovery', [396, 174], 'theta', [
    'I recover from stress with gentle ease.',
  ]),
  i('mental', 'confidence', 'Unshakeable Confidence & Self-Worth', [528, 639], 'alpha', [
    'I trust myself completely.',
  ]),
  i('mental', 'emotional-trauma', 'Emotional Healing & Trauma Release', [396, 417], 'theta', [
    'I release what no longer serves me.',
  ]),
  i('mental', 'habit-rewire', 'Habit Rewiring & Addiction Freedom', [417, 528], 'theta', [
    'New patterns take root with ease.',
  ]),
  i('mental', 'creativity', 'Creativity & Divergent Thinking', [852, 741], 'alpha', [
    'Ideas arrive freely and vividly.',
  ]),
  i('mental', 'social-magnetism', 'Social Magnetism & Charisma', [639, 528], 'alpha', [
    'I connect with ease and warmth.',
  ]),
  i('mental', 'abundance', 'Abundance & Wealth Mindset', [852, 528], 'alpha', [
    'I welcome abundance with open trust.',
  ]),
  i('mental', 'lucid-dream', 'Lucid Dreaming & REM Recall', [40, 852], 'theta', [
    'I remember my dreams with clarity.',
  ]),
  i('mental', 'anger-reg', 'Anger, Irritation & Emotional Regulation', [396, 639], 'alpha', [
    'I respond with steady emotional balance.',
  ]),
  i('mental', 'grief-support', 'Grief, Heartbreak & Loss Support', [417, 639], 'theta', [
    'I allow healing to move through me.',
  ]),
  i('mental', 'decision-clarity', 'Decision Clarity & Mental Decisiveness', [741, 40], 'beta', [
    'I decide with calm, clear certainty.',
  ]),
  i('mental', 'procrastination', 'Procrastination & Motivation Spark', [528, 40], 'beta', [
    'I begin with energy and follow through.',
  ]),
  i('mental', 'fear-phobia', 'Fear, Phobia & Panic Soothing', [396, 174], 'theta', [
    'Fear softens; I am safe in this moment.',
  ]),
  i('mental', 'perfectionism', 'Perfectionism & Self-Criticism Release', [417, 639], 'alpha', [
    'I release harsh judgment of myself.',
  ]),
  i('mental', 'brain-fog', 'Mental Stamina & Brain Fog Clearance', [40, 852], 'beta', [
    'My mind is clear, sharp, and steady.',
  ]),

  // Spiritual
  i('spiritual', 'self-hypnosis', 'Guided Self-Hypnosis & Deep Trance', [174, 7.83], 'theta', [
    'I sink safely into deep, focused trance.',
  ]),
  i('spiritual', 'astral', 'Astral Projection & Out-of-Body Exploration', [7.83, 852], 'theta', [
    'My awareness expands beyond the body.',
  ]),
  i('spiritual', 'kundalini', 'Kundalini Awakening & Energy Rising', [963, 528], 'gamma', [
    'Energy rises through me with wisdom.',
  ]),
  i('spiritual', 'pineal', 'Pineal Gland Activation & Clarity', [963, 852], 'gamma', [
    'My inner vision opens with clarity.',
  ]),
  i('spiritual', 'chakra', 'Chakra Alignment & Energy Flow', [528, 639], 'alpha', [
    'My centers align; energy flows freely.',
  ]),
  i('spiritual', 'heart-coherence', 'Heart Coherence & Unconditional Love', [639, 528], 'alpha', [
    'My heart opens in coherent love.',
  ]),
  i('spiritual', 'intuition', 'Intuition & Higher Guidance', [852, 963], 'alpha', [
    'I trust my inner guidance.',
  ]),
  i('spiritual', 'meditation', 'Deep Meditation & Stillness', [432, 7.83], 'theta', [
    'Stillness deepens with every breath.',
  ]),
  i('spiritual', 'shadow-work', 'Shadow Work & Subconscious Integration', [396, 417], 'theta', [
    'I integrate all parts of myself with care.',
  ]),
  i('spiritual', 'aura-cleanse', 'Aura Cleansing & Energetic Protection', [741, 963], 'alpha', [
    'My field is clear, protected, and bright.',
  ]),
  i('spiritual', 'manifestation', 'Manifestation & Quantum Alignment', [852, 528], 'alpha', [
    'I align with what I create.',
  ]),
  i('spiritual', 'gratitude', 'Gratitude & Elevation of Vibration', [639, 528], 'alpha', [
    'Gratitude lifts my whole being.',
  ]),
  i('spiritual', 'grounding', 'Grounding & Earth Resonance', [174, 7.83], 'delta', [
    'I am grounded in earth resonance.',
  ]),
  i('spiritual', 'unity', 'Higher Consciousness & Unity', [963, 852], 'gamma', [
    'I rest in unity and awareness.',
  ]),
  i('spiritual', 'awakening', 'Spiritual Awakening & Soul Purpose', [852, 963], 'alpha', [
    'My purpose unfolds with clarity.',
  ]),
  i('spiritual', 'forgiveness', 'Forgiveness & Karmic/Past Release', [417, 396], 'theta', [
    'I forgive and release the past.',
  ]),
  i('spiritual', 'non-attachment', 'Inner Peace & Non-Attachment', [432, 639], 'alpha', [
    'Peace remains as I let go.',
  ]),

  // Emotional
  i('emotional', 'anxiety-calm', 'Anxiety & Nervous System Calm', [396, 432], 'alpha', [
    'My nervous system settles into calm.',
  ]),
  i('emotional', 'trauma-release', 'Emotional Healing & Trauma Release', [396, 417], 'theta', [
    'Healing moves through me gently.',
  ]),
  i('emotional', 'grief-recovery', 'Grief, Heartbreak & Loss Recovery', [417, 639], 'theta', [
    'My heart heals in its own time.',
  ]),
  i('emotional', 'self-love', 'Unconditional Self-Love & Acceptance', [639, 528], 'alpha', [
    'I accept myself with unconditional love.',
  ]),
  i('emotional', 'anger-release', 'Anger, Frustration & Resentment Release', [396, 174], 'theta', [
    'I release anger and choose clarity.',
  ]),
  i('emotional', 'fear-soothe', 'Fear, Panic & Insecurity Soothing', [396, 174], 'theta', [
    'I am safe; fear softens now.',
  ]),
  i('emotional', 'heart-open', 'Heart Opening & Vulnerability', [639, 528], 'alpha', [
    'I open my heart with courage.',
  ]),
  i('emotional', 'loneliness', 'Loneliness & Emotional Connection', [639, 417], 'alpha', [
    'Connection finds me; I am not alone.',
  ]),
  i('emotional', 'joy-uplift', 'Joy, Lightness & Emotional Uplift', [528, 639], 'alpha', [
    'Joy rises naturally within me.',
  ]),
  i('emotional', 'mood-stability', 'Emotional Regulation & Mood Stability', [432, 528], 'alpha', [
    'My emotions stay steady and clear.',
  ]),
  i('emotional', 'letting-go', 'Forgiveness & Letting Go', [417, 396], 'theta', [
    'I forgive and let go with ease.',
  ]),
  i('emotional', 'inner-child', 'Inner Child Comfort & Safety', [528, 639], 'theta', [
    'My inner child feels safe and held.',
  ]),
  i('emotional', 'envy-release', 'Jealousy, Comparison & Envy Release', [417, 639], 'alpha', [
    'I release comparison; I am enough.',
  ]),
  i('emotional', 'stress-exhaustion', 'Stress Relief & Emotional Exhaustion Recovery', [174, 396], 'delta', [
    'I rest and restore my emotional energy.',
  ]),
]

export const INTENT_CATEGORIES: {
  id: IntentCategory
  label: string
  blurb: string
}[] = [
  { id: 'physical', label: 'Physical', blurb: 'Body, sleep, recovery, vitality' },
  { id: 'mental', label: 'Mental', blurb: 'Focus, mindset, clarity, habits' },
  { id: 'spiritual', label: 'Spiritual', blurb: 'Meditation, energy, purpose' },
  { id: 'emotional', label: 'Emotional', blurb: 'Calm, healing, heart, mood' },
  { id: 'custom', label: 'Custom Intent', blurb: 'Your own goal, lines, and Hz' },
]

export function issuesForCategory(cat: Exclude<IntentCategory, 'custom'>) {
  return ISSUES.filter((x) => x.category === cat)
}

export function getIssue(id: string) {
  return ISSUES.find((x) => x.id === id) ?? null
}
