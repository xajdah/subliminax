/**
 * Multi-page textbook OCR for Subliminal Study.
 * Uses tesseract.js (createWorker) loaded dynamically.
 */

export interface OcrPageResult {
  fileName: string
  text: string
}

export interface OcrProgress {
  page: number
  total: number
  status: string
  progress: number
}

function cleanOcrText(raw: string): string {
  return raw
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[^\S\n]{2,}/g, ' ')
    .trim()
}

/** Map study language codes to Tesseract lang packs (best-effort). */
export function tesseractLangFor(studyLang: string): string {
  const map: Record<string, string> = {
    en: 'eng',
    sr: 'srp+eng',
    de: 'deu+eng',
    fr: 'fra+eng',
    es: 'spa+eng',
    it: 'ita+eng',
    pt: 'por+eng',
    hi: 'hin+eng',
    ur: 'urd+eng',
    ar: 'ara+eng',
    ja: 'jpn+eng',
    zh: 'chi_sim+eng',
  }
  return map[studyLang] ?? 'eng'
}

export async function ocrLessonPages(
  files: File[],
  opts?: {
    lang?: string
    onProgress?: (p: OcrProgress) => void
  },
): Promise<OcrPageResult[]> {
  if (!files.length) return []

  let createWorker: typeof import('tesseract.js').createWorker
  try {
    const mod = await import('tesseract.js')
    createWorker = mod.createWorker
  } catch {
    throw new Error(
      'OCR engine not available. Install tesseract.js or paste text manually.',
    )
  }

  const lang = tesseractLangFor(opts?.lang ?? 'en')
  // Prefer eng alone when multi-lang packs may be missing offline
  const safeLang = lang.includes('+') ? 'eng' : lang

  const worker = await createWorker(safeLang, undefined, {
    logger: (m) => {
      opts?.onProgress?.({
        page: 0,
        total: files.length,
        status: m.status,
        progress: m.progress,
      })
    },
  })

  const out: OcrPageResult[] = []
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!
      opts?.onProgress?.({
        page: i + 1,
        total: files.length,
        status: `Scanning ${file.name}`,
        progress: 0,
      })
      const { data } = await worker.recognize(file)
      out.push({ fileName: file.name, text: cleanOcrText(data.text || '') })
      opts?.onProgress?.({
        page: i + 1,
        total: files.length,
        status: 'done',
        progress: 1,
      })
    }
  } finally {
    await worker.terminate()
  }
  return out
}

/** Merge page texts with page separators for the lesson textarea. */
export function mergeOcrPages(pages: OcrPageResult[]): string {
  return pages
    .map((p, i) => `--- Page ${i + 1}: ${p.fileName} ---\n${p.text}`)
    .join('\n\n')
    .trim()
}
