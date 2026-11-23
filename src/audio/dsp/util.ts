/** DSP helpers — gain staging, Nyquist, click-free automation */

export function dbToGain(db: number): number {
  return Math.pow(10, db / 20)
}

export function gainToDb(g: number): number {
  if (g <= 1e-8) return -100
  return 20 * Math.log10(g)
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

/** Smooth parameter change — prevents zipper noise / clicks */
export function setParam(
  param: AudioParam,
  value: number,
  ctx: BaseAudioContext,
  tau = 0.05,
): void {
  const v = Number.isFinite(value) ? value : param.value
  param.cancelScheduledValues(ctx.currentTime)
  param.setTargetAtTime(v, ctx.currentTime, tau)
}

/** Clamp Hz to Nyquist − 1 kHz safety margin */
export function nyquistClamp(hz: number, sampleRate: number): number {
  const max = sampleRate / 2 - 1000
  return clamp(hz, 1, Math.max(1, max))
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
