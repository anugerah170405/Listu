import { useEffect, useRef } from 'react'
import type { Card, TaskStatus } from '../types'
import { fetchTracks, trackToCard } from '../services/api'
import { showSnackbar } from '../utils/snackbar'

interface UseTaskSyncOptions {
  cards: Card[]
  setCards: React.Dispatch<React.SetStateAction<Card[]>>
  enabled?: boolean
  intervalMs?: number
}

function getActiveTasks(cards: Card[]): Map<string, Record<string, TaskStatus>> {
  const map = new Map<string, Record<string, TaskStatus>>()
  for (const card of cards) {
    if (!card.processing) continue
    const activeForCard: Record<string, TaskStatus> = {}
    for (const [taskName, task] of Object.entries(card.processing)) {
      if (task && task.status === 'processing') {
        activeForCard[taskName] = task
      }
    }
    if (Object.keys(activeForCard).length > 0) {
      map.set(card.id, activeForCard)
    }
  }
  return map
}

export function useTaskSync({
  cards,
  setCards,
  enabled = true,
  intervalMs = 5000,
}: UseTaskSyncOptions) {
  const activeTasks = getActiveTasks(cards)
  const isPollingActive = enabled && activeTasks.size > 0
  const prevActiveRef = useRef<Map<string, Record<string, TaskStatus>>>(new Map())

  useEffect(() => {
    if (isPollingActive) {
      prevActiveRef.current = activeTasks
    }
  }, [activeTasks, isPollingActive])

  useEffect(() => {
    if (!isPollingActive) return

    let isMounted = true
    let isRequestInFlight = false

    const poll = async () => {
      if (isRequestInFlight) return
      isRequestInFlight = true

      try {
        const remoteTracks = await fetchTracks()
        if (!isMounted) return

        const freshCards = remoteTracks.map(trackToCard)
        const freshMap = new Map(freshCards.map((c) => [c.id, c]))

        // Check if any previously running task has finished or failed
        prevActiveRef.current.forEach((prevTasks, trackId) => {
          const fresh = freshMap.get(trackId)
          if (!fresh || !fresh.processing) return

          Object.keys(prevTasks).forEach((taskName) => {
            const currentStatus = fresh.processing?.[taskName]
            if (!currentStatus) return

            if (currentStatus.status === 'ready') {
              if (taskName === 'separator') {
                showSnackbar('Vocals and instrumental separated successfully!', 'success')
              } else if (taskName === 'lyrics') {
                showSnackbar('Lyrics generated and synchronized successfully!', 'success')
              } else if (taskName === 'transformer') {
                showSnackbar(`${fresh.genre || 'Transformed'} version ready!`, 'success')
              } else {
                showSnackbar(`Task ${taskName} finished!`, 'success')
              }
            } else if (currentStatus.status === 'failed') {
              showSnackbar(
                currentStatus.error || `Task ${taskName} failed to complete`,
                'error'
              )
            }
          })
        })

        // Update cards smoothly: server is the authority on existing tracks
        setCards((prev) => {
          const prevMap = new Map(prev.map((c) => [c.id, c]))

          // Map fresh tracks from server, preserving local audioFile/preview if present
          const synced = freshCards.map((fresh) => {
            const old = prevMap.get(fresh.id)
            return old
              ? {
                  ...old,
                  ...fresh,
                  audio: fresh.audio || old.audio,
                  src: fresh.src || old.src,
                }
              : fresh
          })

          // Preserve any in-flight local uploads not yet registered on server
          const pendingUploads = prev.filter((c) => c.audioFile && !freshMap.has(c.id))
          return [...pendingUploads, ...synced]
        })
      } catch (err: unknown) {
        if (!isMounted) return
        console.warn('Task sync polling error:', err)

        const errorMsg =
          err instanceof Error && err.message
            ? err.message
            : 'Koneksi ke backend terputus saat memproses task'

        showSnackbar(`Gagal menghubungi backend: ${errorMsg}`, 'error')

        // Mark currently processing tasks as failed so UI doesn't hang forever
        setCards((prev) =>
          prev.map((c) => {
            if (!c.processing) return c
            let hasChanged = false
            const nextProcessing = { ...c.processing }

            for (const [tName, tVal] of Object.entries(nextProcessing)) {
              if (tVal?.status === 'processing') {
                nextProcessing[tName] = {
                  ...tVal,
                  status: 'failed',
                  error: 'Koneksi ke backend terputus',
                  updated_at: new Date().toISOString(),
                }
                hasChanged = true
              }
            }

            return hasChanged ? { ...c, processing: nextProcessing } : c
          })
        )
      } finally {
        isRequestInFlight = false
      }
    }

    const timer = setInterval(poll, intervalMs)
    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [isPollingActive, intervalMs, setCards])
}
