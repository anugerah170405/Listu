const LRC_LINE = /^\[(\d{1,2}):(\d{2}(?:\.\d+)?)\]\s*(.*)$/

const isValidTime = (t: unknown): t is number => typeof t === 'number' && !isNaN(t)

export function parseLyrics(text: string): { lines: string[]; times?: number[] } {
  const raw = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const matches = raw.map((line) => line.match(LRC_LINE))
  if (!matches.some(Boolean)) return { lines: raw }

  const lines = raw.map((line, i) => matches[i]?.[3].trim() ?? line)
  const times = matches.map((m) => (m ? Math.round((parseFloat(m[1]) * 60 + parseFloat(m[2])) * 100) / 100 : undefined))
  return { lines, times: times as number[] }
}

export function findActiveLine(times: (number | null | undefined)[] | undefined, lineCount: number, now: number): number {
  let active = -1
  if (!times?.length) return active
  // Pick the line with the latest start time <= now (stable even if timestamps are not sorted by index)
  let best = -Infinity
  for (let i = 0; i < lineCount; i++) {
    const t = times[i]
    if (isValidTime(t) && now >= t && t >= best) {
      best = t
      active = i
    }
  }
  return active
}

export { isValidTime }
