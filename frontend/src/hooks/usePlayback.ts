import { useCallback, useEffect, useRef, useState } from 'react'
import type { Card } from '../types'

const DEFAULT_DURATION = 180

export function parseDuration(duration?: string): number {
  const parts = (duration ?? '').split(':').map(Number)
  const valid = parts.length === 2 && parts.every((n) => !isNaN(n))
  return valid ? parts[0] * 60 + parts[1] : DEFAULT_DURATION
}

export function usePlayback(card: Card | undefined, playing: boolean, onEnded: () => void) {
  const [time, setTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState<number | null>(null)
  const [prevCardId, setPrevCardId] = useState(card?.id)
  const lastTimeRef = useRef(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const onEndedRef = useRef(onEnded)

  useEffect(() => {
    lastTimeRef.current = time
  }, [time])

  useEffect(() => {
    onEndedRef.current = onEnded
  }, [onEnded])

  if (card?.id !== prevCardId) {
    setPrevCardId(card?.id)
    setTime(0)
    setAudioDuration(null)
  }

  const duration = audioDuration ?? parseDuration(card?.duration)

  useEffect(() => {
    if (!card) return

    if (card.audio) {
      const audio = new Audio(card.audio)
      audioRef.current = audio
      if (lastTimeRef.current > 0) audio.currentTime = lastTimeRef.current

      const onMetadata = () => isFinite(audio.duration) && setAudioDuration(audio.duration)
      const onTimeUpdate = () => setTime(audio.currentTime)
      const onAudioEnded = () => onEndedRef.current()

      audio.addEventListener('loadedmetadata', onMetadata)
      audio.addEventListener('timeupdate', onTimeUpdate)
      audio.addEventListener('ended', onAudioEnded)
      if (playing) audio.play().catch(() => {})

      return () => {
        audio.removeEventListener('loadedmetadata', onMetadata)
        audio.removeEventListener('timeupdate', onTimeUpdate)
        audio.removeEventListener('ended', onAudioEnded)
        audio.pause()
        audioRef.current = null
      }
    }

    if (!playing) return

    let rafId = 0
    let last = performance.now()
    const tick = (now: number) => {
      const delta = (now - last) / 1000
      last = now
      setTime((prev) => {
        const next = prev + delta
        if (duration > 0 && next >= duration) {
          onEndedRef.current()
          return 0
        }
        return next
      })
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [card?.id, card?.audio])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !card?.audio) return
    if (playing) audio.play().catch(() => {})
    else audio.pause()
  }, [playing, card?.audio])

  const seek = useCallback(
    (target: number) => {
      const clamped = Math.max(0, Math.min(duration, target))
      setTime(clamped)
      if (audioRef.current) audioRef.current.currentTime = clamped
    },
    [duration]
  )

  return { time, duration, seek }
}
