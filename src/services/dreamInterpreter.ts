/**
 * One-click dream interpreter — structured psychological reading
 * grounded in symbols, emotional tone, and active Subliminax affirmations/goals.
 * Offline heuristic engine (no network); responses localized by language code.
 */

import type { DreamInterpretation, DreamLanguageCode } from '../types/remscribe'

const SYMBOL_MAP: { keys: string[]; symbol: string; meaning: string }[] = [
  { keys: ['water', 'ocean', 'river', 'lake', 'rain', 'swim', 'sea'], symbol: 'Water', meaning: 'emotions, flow, cleansing' },
  { keys: ['fly', 'flying', 'sky', 'wings', 'float'], symbol: 'Flight', meaning: 'freedom, perspective, release' },
  { keys: ['fall', 'falling', 'drop', 'cliff'], symbol: 'Falling', meaning: 'loss of control, surrender, transition' },
  { keys: ['house', 'home', 'room', 'door', 'window'], symbol: 'Dwelling', meaning: 'self, boundaries, inner rooms' },
  { keys: ['chase', 'run', 'running', 'escape', 'hide'], symbol: 'Pursuit', meaning: 'avoidance, pressure, unresolved conflict' },
  { keys: ['animal', 'dog', 'cat', 'snake', 'bird', 'wolf'], symbol: 'Animal', meaning: 'instinct, shadow traits, vitality' },
  { keys: ['death', 'die', 'dead', 'funeral', 'grave'], symbol: 'Ending', meaning: 'transformation, release of old identity' },
  { keys: ['child', 'baby', 'kid', 'school'], symbol: 'Inner Child', meaning: 'innocence, unmet needs, new beginnings' },
  { keys: ['light', 'sun', 'moon', 'star', 'fire'], symbol: 'Light / Fire', meaning: 'clarity, spirit, willpower' },
  { keys: ['dark', 'night', 'shadow', 'black'], symbol: 'Shadow', meaning: 'unknown material, integration work' },
  { keys: ['exam', 'test', 'fail', 'late'], symbol: 'Evaluation', meaning: 'self-judgment, readiness anxiety' },
  { keys: ['love', 'kiss', 'partner', 'wedding', 'friend'], symbol: 'Bond', meaning: 'connection, belonging, heart themes' },
  { keys: ['money', 'gold', 'rich', 'steal'], symbol: 'Value', meaning: 'self-worth, security, exchange' },
  { keys: ['car', 'train', 'plane', 'road', 'lost'], symbol: 'Journey', meaning: 'life direction, agency, path' },
  { keys: ['teeth', 'naked', 'clothes'], symbol: 'Vulnerability', meaning: 'exposure, image, integrity' },
]

const TONE_WORDS: { keys: string[]; tone: string }[] = [
  { keys: ['afraid', 'fear', 'scared', 'terror', 'panic'], tone: 'anxious / threatened' },
  { keys: ['happy', 'joy', 'peaceful', 'calm', 'love'], tone: 'warm / expansive' },
  { keys: ['sad', 'cry', 'grief', 'lonely'], tone: 'melancholic / tender' },
  { keys: ['angry', 'rage', 'fight', 'yell'], tone: 'activated / assertive' },
  { keys: ['confused', 'lost', 'strange', 'weird'], tone: 'disoriented / liminal' },
]

const I18N: Record<
  DreamLanguageCode,
  {
    noSymbols: string
    toneDefault: string
    summary: (opts: {
      symbols: string
      tone: string
      links: string
    }) => string
    linkNone: string
  }
> = {
  'en-US': {
    noSymbols: 'open imagery',
    toneDefault: 'reflective / mixed',
    linkNone: 'your current intentions',
    summary: ({ symbols, tone, links }) =>
      `This dream weaves ${symbols} through a ${tone} emotional field. Subconsciously, it appears to dialogue with ${links} — inviting integration rather than literal prediction. Notice where the dream asked you to move, speak, or rest; that gesture is often the psyche's prescription for waking life.`,
  },
  'es-ES': {
    noSymbols: 'imágenes abiertas',
    toneDefault: 'reflexivo / mixto',
    linkNone: 'tus intenciones actuales',
    summary: ({ symbols, tone, links }) =>
      `Este sueño entrelaza ${symbols} en un campo emocional ${tone}. Parece dialogar con ${links}. Observa dónde el sueño te pidió moverte, hablar o descansar; ese gesto suele ser la receta del inconsciente.`,
  },
  'fr-FR': {
    noSymbols: 'images ouvertes',
    toneDefault: 'réfléchi / mixte',
    linkNone: 'vos intentions actuelles',
    summary: ({ symbols, tone, links }) =>
      `Ce rêve tisse ${symbols} dans un champ émotionnel ${tone}. Il dialogue avec ${links}. Remarquez où le rêve vous a demandé d'agir, de parler ou de vous reposer.`,
  },
  'de-DE': {
    noSymbols: 'offene Bilder',
    toneDefault: 'nachdenklich / gemischt',
    linkNone: 'deine aktuellen Absichten',
    summary: ({ symbols, tone, links }) =>
      `Dieser Traum verwebt ${symbols} in einem ${tone} emotionalen Feld und spricht mit ${links}. Achte darauf, wo dich der Traum zum Handeln, Sprechen oder Ruhen einlud.`,
  },
  'it-IT': {
    noSymbols: 'immagini aperte',
    toneDefault: 'riflessivo / misto',
    linkNone: 'le tue intenzioni attuali',
    summary: ({ symbols, tone, links }) =>
      `Questo sogno intreccia ${symbols} in un campo emotivo ${tone} e dialoga con ${links}. Nota dove il sogno ti chiedeva di muoverti, parlare o riposare.`,
  },
  'pt-PT': {
    noSymbols: 'imagens abertas',
    toneDefault: 'reflexivo / misto',
    linkNone: 'as tuas intenções atuais',
    summary: ({ symbols, tone, links }) =>
      `Este sonho entrelaça ${symbols} num campo emocional ${tone} e dialoga com ${links}. Repara onde o sonho pediu movimento, fala ou descanso.`,
  },
  'sr-RS': {
    noSymbols: 'otvorene slike',
    toneDefault: 'reflektivno / mešovito',
    linkNone: 'tvoje trenutne namere',
    summary: ({ symbols, tone, links }) =>
      `Ovaj san prepliće ${symbols} kroz ${tone} emocionalno polje i razgovara sa ${links}. Primeti gde te san poziva da se krećeš, govoriš ili odmaraš.`,
  },
  'hi-IN': {
    noSymbols: 'खुली छवियाँ',
    toneDefault: 'चिंतनशील / मिश्रित',
    linkNone: 'आपके वर्तमान इरादे',
    summary: ({ symbols, tone, links }) =>
      `यह स्वप्न ${symbols} को ${tone} भावनात्मक क्षेत्र में बुनता है और ${links} से संवाद करता है। देखें कि स्वप्न कहाँ आपको चलने, बोलने या विश्राम करने को कहता है।`,
  },
  'ur-PK': {
    noSymbols: 'کھلی تصاویر',
    toneDefault: 'تفکری / مخلوط',
    linkNone: 'آپ کے موجودہ ارادے',
    summary: ({ symbols, tone, links }) =>
      `یہ خواب ${symbols} کو ${tone} جذباتی میدان میں بُنتا ہے اور ${links} سے مکالمہ کرتا ہے۔ دیکھیں خواب کہاں حرکت، گفتگو یا سکون کی دعوت دیتا ہے۔`,
  },
  'ar-SA': {
    noSymbols: 'صور مفتوحة',
    toneDefault: 'تأملي / مختلط',
    linkNone: 'نواياك الحالية',
    summary: ({ symbols, tone, links }) =>
      `ينسج هذا الحلم ${symbols} عبر حقل عاطفي ${tone} ويتحاور مع ${links}. لاحظ أين دعاك الحلم إلى الحركة أو الكلام أو الراحة.`,
  },
  'ja-JP': {
    noSymbols: '開かれたイメージ',
    toneDefault: '内省的 / 混合',
    linkNone: 'いまの意図',
    summary: ({ symbols, tone, links }) =>
      `この夢は${symbols}を${tone}な感情の場に織り込み、${links}と対話しています。動く・語る・休むよう促された箇所に注目してください。`,
  },
  'zh-CN': {
    noSymbols: '开放意象',
    toneDefault: '内省 / 混合',
    linkNone: '你当前的意图',
    summary: ({ symbols, tone, links }) =>
      `此梦将${symbols}编织进${tone}的情绪场域，并与${links}对话。留意梦境何处邀请你行动、开口或休息。`,
  },
}

export function interpretDream(opts: {
  transcript: string
  language: DreamLanguageCode
  affirmations?: string[]
  goalNames?: string[]
}): DreamInterpretation {
  const text = opts.transcript.toLowerCase()
  const symbolsFound: { symbol: string; meaning: string }[] = []
  for (const row of SYMBOL_MAP) {
    if (row.keys.some((k) => text.includes(k))) {
      symbolsFound.push({ symbol: row.symbol, meaning: row.meaning })
    }
  }
  let tone = I18N[opts.language]?.toneDefault ?? I18N['en-US'].toneDefault
  for (const row of TONE_WORDS) {
    if (row.keys.some((k) => text.includes(k))) {
      tone = row.tone
      break
    }
  }

  const affirmations = (opts.affirmations ?? []).filter(Boolean).slice(0, 4)
  const goals = (opts.goalNames ?? []).filter(Boolean).slice(0, 3)
  const links: string[] = []
  for (const a of affirmations) {
    const words = a.toLowerCase().split(/\s+/).filter((w) => w.length > 4)
    if (words.some((w) => text.includes(w)) || affirmations.length <= 2) {
      links.push(`affirmation “${a.slice(0, 60)}”`)
    }
  }
  for (const g of goals) links.push(`goal “${g}”`)

  const pack = I18N[opts.language] ?? I18N['en-US']
  const symbolList =
    symbolsFound.length > 0
      ? symbolsFound.map((s) => `${s.symbol} (${s.meaning})`).join(', ')
      : pack.noSymbols
  const linkStr = links.length > 0 ? links.join('; ') : pack.linkNone

  return {
    symbols: symbolsFound.map((s) => s.symbol),
    emotionalTone: tone,
    affirmationLinks: links,
    summary: pack.summary({ symbols: symbolList, tone, links: linkStr }),
    language: opts.language,
    createdAt: Date.now(),
  }
}
