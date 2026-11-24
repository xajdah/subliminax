export interface VoyageCardInput {
  question: string
  letter: string
  date: Date
  strokes: number
}

function drawSigil(ctx: CanvasRenderingContext2D, x: number, y: number, strokes: number) {
  ctx.save()
  ctx.strokeStyle = '#c48a48'
  ctx.fillStyle = '#c48a48'
  ctx.lineWidth = 3
  ctx.globalAlpha = strokes >= 1 ? 1 : 0.35
  ctx.beginPath()
  ctx.arc(x, y, 72, 0, Math.PI * 2)
  ctx.stroke()
  ctx.globalAlpha = 1
  if (strokes >= 3) {
    ctx.beginPath()
    ctx.arc(x, y, 28, 0, Math.PI * 2)
    ctx.stroke()
  }
  if (strokes >= 2) {
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x, y - 86)
    ctx.stroke()
  }
  const lights = Math.min(8, Math.max(0, strokes - 3))
  for (let i = 0; i < lights; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / 8
    ctx.beginPath()
    ctx.arc(x + Math.cos(angle) * 96, y + Math.sin(angle) * 96, 5, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (ctx.measureText(next).width <= maxWidth) {
      current = next
      continue
    }
    if (current) lines.push(current)
    current = word
    if (lines.length === maxLines - 1) break
  }
  if (current && lines.length < maxLines) lines.push(current)
  if (lines.length === maxLines && words.join(' ') !== lines.join(' ')) {
    const last = lines[maxLines - 1] ?? ''
    lines[maxLines - 1] = last.replace(/[.,]?$/, '') + '…'
  }
  return lines
}

export async function renderVoyageCard(input: VoyageCardInput): Promise<Blob> {
  await document.fonts.load('800 72px Syne')
  await document.fonts.load('500 36px Outfit')
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1440
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not draw the card')

  ctx.fillStyle = '#0b1214'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const glow = ctx.createRadialGradient(540, 420, 40, 540, 480, 520)
  glow.addColorStop(0, 'rgba(45, 212, 191, 0.28)')
  glow.addColorStop(1, 'rgba(11, 18, 20, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  drawSigil(ctx, 540, 250, input.strokes)

  ctx.fillStyle = '#c48a48'
  ctx.font = '600 28px Syne, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('AUREVIA', 540, 390)

  const question = input.question.trim() || 'The next true step'
  ctx.fillStyle = '#8aa0a6'
  ctx.font = '500 32px Outfit, sans-serif'
  const qLines = wrapLines(ctx, question, 820, 3)
  qLines.forEach((line, i) => ctx.fillText(line, 540, 480 + i * 46))

  ctx.fillStyle = '#f4f7f6'
  ctx.font = '700 64px Syne, sans-serif'
  const letterLines = wrapLines(ctx, input.letter.trim() || 'What you were shown', 860, 8)
  const letterTop = 700
  letterLines.forEach((line, i) => ctx.fillText(line, 540, letterTop + i * 78))

  ctx.fillStyle = '#2dd4bf'
  ctx.font = '600 30px Outfit, sans-serif'
  ctx.fillText('A voyage to my higher self', 540, 1280)
  ctx.fillStyle = '#8aa0a6'
  ctx.font = '500 26px Outfit, sans-serif'
  ctx.fillText(
    input.date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }),
    540,
    1336,
  )

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Could not save the card')
  return blob
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export async function shareOrSaveCard(blob: Blob, text: string): Promise<'shared' | 'saved'> {
  const file = new File([blob], 'aurevia.png', { type: 'image/png' })
  if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'Aurevia', text })
    return 'shared'
  }
  downloadBlob(blob, 'aurevia.png')
  return 'saved'
}
