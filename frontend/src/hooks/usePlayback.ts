import { useCallback, useEffect, useRef, useState } from 'react'
import type { Card } from '../types'
import { parseDuration } from '../utils/format'

export function usePlayback(card: Card | undefined, playing: boolean, onEnded: () => void) {
  const [time, setTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState<number | null>(null)
  const [prevCardId, setPrevCardId] = useState(card?.id)
  const lastTimeRef = useRef(0)
  const playingRef = useRef(playing)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const onEndedRef = useRef(onEnded)

  useEffect(() => {
    lastTimeRef.current = time
  }, [time])

  useEffect(() => {
    playingRef.current = playing
  }, [playing])

  useEffect(() => {
    onEndedRef.current = onEnded
  }, [onEnded])

  if (card?.id !== prevCardId) {
    setPrevCardId(card?.id)
    setTime(0)
    setAudioDuration(null)
  }

  const duration = audioDuration ?? parseDuration(card?.duration)
  const cardId = card?.id
  const cardAudio = card?.audio

  useEffect(() => {
    if (!cardId || !cardAudio) return

    const audio = new Audio(cardAudio)
    audioRef.current = audio
    if (lastTimeRef.current > 0) audio.currentTime = lastTimeRef.current

    const onMetadata = () => isFinite(audio.duration) && setAudioDuration(audio.duration)
    const onTimeUpdate = () => setTime(audio.currentTime)
    const onAudioEnded = () => onEndedRef.current()

    audio.addEventListener('loadedmetadata', onMetadata)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('ended', onAudioEnded)
    if (playingRef.current) audio.play().catch(() => {})

    return () => {
      audio.removeEventListener('loadedmetadata', onMetadata)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('ended', onAudioEnded)
      audio.pause()
      audioRef.current = null
    }
  }, [cardId, cardAudio])

  useEffect(() => {
    if (!cardId || cardAudio || !playing) return

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
  }, [cardId, cardAudio, playing, duration])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !cardAudio) return
    if (playing) audio.play().catch(() => {})
    else audio.pause()
  }, [playing, cardAudio])

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
