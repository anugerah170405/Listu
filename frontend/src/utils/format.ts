export function formatTime(seconds: number, withFraction = false): string {
  const s = Math.max(0, seconds || 0)
  const m = Math.floor(s / 60)
  const rem = s % 60
  const secStr = withFraction
    ? rem.toFixed(1).padStart(4, '0')
    : String(Math.floor(rem)).padStart(2, '0')
  return `${String(m).padStart(2, '0')}:${secStr}`
}

export function parseDuration(duration?: string, defaultDuration = 180): number {
  const parts = (duration ?? '').split(':').map(Number)
  const valid = parts.length === 2 && parts.every((n) => !isNaN(n))
  return valid ? parts[0] * 60 + parts[1] : defaultDuration
}

export function formatDate(iso?: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return isNaN(d.getTime())
    ? '-'
    : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}
