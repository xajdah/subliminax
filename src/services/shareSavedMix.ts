import { getTrack } from '../data/moodTracks'
import type { SavedMix } from '../types/savedMix'

/** Share a saved mix summary via Web Share API, else copy to clipboard. */
export async function shareSavedMix(mix: SavedMix): Promise<'shared' | 'copied'> {
  const track = getTrack(mix.session.soundtrack.trackId)
  const script = mix.session.voice.script.trim()
  const text = [
    mix.title,
    `${mix.session.frequency.hz} Hz · ${track?.name ?? 'Soundtrack'} · ${mix.session.frequency.entrainment}`,
    script ? `\n${script}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: mix.title, text })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') throw e
      /* fall through to clipboard */
    }
  }

  await navigator.clipboard.writeText(text)
  return 'copied'
}
