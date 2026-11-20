import { formatTime } from './format'

type AudioContextCtor = typeof AudioContext

export async function getAudioDuration(file: File): Promise<string> {
  try {
    const Ctor: AudioContextCtor =
      window.AudioContext || (window as unknown as { webkitAudioContext: AudioContextCtor }).webkitAudioContext
    const ctx = new Ctor()
    const decoded = await ctx.decodeAudioData(await file.arrayBuffer())
    ctx.close()
    return formatTime(decoded.duration)
  } catch {
    return '00:00'
  }
}
