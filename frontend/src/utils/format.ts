export function formatTime(seconds: number, withFraction = false): string {
  const s = Math.max(0, seconds || 0)
  const m = Math.floor(s / 60)
  const rem = s % 60
  const secStr = withFraction
    ? rem.toFixed(1).padStart(4, '0')
    : String(Math.floor(rem)).padStart(2, '0')
  return `${String(m).padStart(2, '0')}:${secStr}`
}

