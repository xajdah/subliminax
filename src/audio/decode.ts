/** Decode an uploaded / recorded Blob into an AudioBuffer. */
export async function decodeAudioBlob(ctx: AudioContext, blob: Blob): Promise<AudioBuffer> {
  const arr = await blob.arrayBuffer()
  return ctx.decodeAudioData(arr.slice(0))
}
