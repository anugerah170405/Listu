import { useCallback, useEffect, useRef, useState } from 'react'
import type { Card } from '../types'

export function parseDuration(duration?: string): number {
  if (!duration) return 180
  const parts = duration.split(':').map(Number)
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1]
  }
  return 180
}

export function usePlayback(
  card: Card | undefined,
  playing: boolean,
  onEnded: () => void
) {
  const [time, setTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState<number | null>(null)
  const [prevCardId, setPrevCardId] = useState<string | undefined>(card?.id)
  const lastTimeRef = useRef(0)

  // Update lastTimeRef setiap kali time berubah
  useEffect(() => {
    lastTimeRef.current = time
  }, [time])

  // Reset time and custom duration whenever the active card changes
  if (card?.id !== prevCardId) {
    setPrevCardId(card?.id)
    setTime(0)
    setAudioDuration(null)
  }

  const duration = audioDuration ?? parseDuration(card?.duration)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const onEndedRef = useRef(onEnded)

  useEffect(() => {
    onEndedRef.current = onEnded
  }, [onEnded])

  // Playback handling: Real HTML5 Audio if audio URL is present, otherwise smooth simulation for prototyping
  useEffect(() => {
    if (!card) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      return
    }

    if (card.audio) {
      const audio = new Audio(card.audio)
      audioRef.current = audio

      if (lastTimeRef.current > 0) {
        audio.currentTime = lastTimeRef.current
      }

      const handleLoadedMetadata = () => {
        if (!isNaN(audio.duration) && isFinite(audio.duration)) {
          setAudioDuration(audio.duration)
        }
      }
      const handleTimeUpdate = () => {
        setTime(audio.currentTime)
      }
      const handleEnded = () => {
        onEndedRef.current()
      }

      audio.addEventListener('loadedmetadata', handleLoadedMetadata)
      audio.addEventListener('timeupdate', handleTimeUpdate)
      audio.addEventListener('ended', handleEnded)

      if (playing) {
        audio.play().catch(() => { })
      }

      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
        audio.removeEventListener('timeupdate', handleTimeUpdate)
        audio.removeEventListener('ended', handleEnded)
        audio.pause()
        audioRef.current = null
      }
    } else {
      // Mock playback simulation for frontend design
      if (!playing) return

      let rafId = 0
      let lastTime = performance.now()

      const tick = (now: number) => {
        const delta = (now - lastTime) / 1000
        lastTime = now

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

      return () => {
        cancelAnimationFrame(rafId)
      }
    }
  }, [card?.id, card?.audio])

  // Synchronize playing state with audio element if audio exists
  useEffect(() => {
    if (audioRef.current && card?.audio) {
      if (playing) {
        audioRef.current.play().catch(() => { })
      } else {
        audioRef.current.pause()
      }
    }
  }, [playing, card?.audio])

  const seek = useCallback(
    (targetTime: number) => {
      const clamped = Math.max(0, Math.min(duration, targetTime))
      setTime(clamped)
      if (audioRef.current) {
        audioRef.current.currentTime = clamped
      }
    },
    [duration]
  )

  return { time, duration, seek }
}
