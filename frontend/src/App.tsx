import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate, useMatch, useSearchParams } from 'react-router-dom'
import { SlidersIcon } from 'lucide-react'
import { usePlayback } from './hooks/usePlayback'
import { type Stem, type Card } from './types'
import CardMenu from './components/ui/CardMenu'
import FloatingNav from './components/ui/FloatingNav'
import StudioPanel from './components/panel/StudioPanel'
import LiquidScene from './components/scene/LiquidScene'
import { fetchTracks, createTrack, deleteTrack, updateTrackMetadata, trackToCard } from './services/api'
import TopSnackbar from './components/ui/TopSnackbar'
import EmptyState from './components/ui/EmptyState'
import type { SnackbarData } from './utils/snackbar'
import { getAudioDuration } from './utils/audio'
import { findActiveLine, isValidTime } from './utils/lyrics'

const STEM_SOURCE = { vocal: 'vocalsAudio', instrumental: 'instrumentalAudio' } as const

export default function App() {
  const navigate = useNavigate()
  const match = useMatch('/track/:trackId')
  const playId = match?.params.trackId ?? null
  const [searchParams, setSearchParams] = useSearchParams()
  const studio = searchParams.get('studio') === 'true'
  const [snackbar, setSnackbar] = useState<SnackbarData | null>({ message: 'Loading data', type: 'loading' })
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [menu, setMenu] = useState<{ card: Card; x: number; y: number } | null>(null)
  const [stem, setStem] = useState<Stem>('full')

  const current = cards.find((c) => c.id === playId)
  const index = current ? cards.indexOf(current) : -1

  useEffect(() => {
    fetchTracks()
      .then((tracks) => {
        setCards(tracks.map(trackToCard))
        setSnackbar(null)
      })
      .catch((err) => {
        console.warn(err.message, err)
        setSnackbar({ message: err.message, type: 'error' })
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!loading && playId && !current) navigate('/', { replace: true })
  }, [loading, playId, current, navigate])

  useEffect(() => {
    if (!current) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && navigate('/')
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, navigate])

  const togglePlay = () => setPlaying((p) => !p)

  const openTrack = (card: Card, openStudio = false) => {
    setStem('full')
    setPlaying(true)
    navigate(`/track/${card.id}${openStudio ? '?studio=true' : ''}`)
  }

  const step = (dir: number) => {
    if (index >= 0) openTrack(cards[(index + dir + cards.length) % cards.length], studio)
  }

  const activeCard = useMemo(() => {
    if (!current) return undefined
    const source = stem === 'full' ? undefined : current[STEM_SOURCE[stem]]
    return { ...current, audio: source ?? current.audio }
  }, [current, stem])

  const { time, duration, seek } = usePlayback(activeCard, playing, () => step(1))

  const lines = current?.lyrics ?? []
  const activeLine = findActiveLine(current?.lyricTimes, lines.length, time)

  const prev = () => (time > 3 ? seek(0) : step(-1))

  const updateCard = (id: string, patch: Partial<Card>) => {
    setCards((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)))
    updateTrackMetadata(id, {
      title: patch.title,
      artist: patch.artist,
      cover_url: patch.src,
      genre: patch.genre,
      lyrics_lines: patch.lyrics,
      lyrics_times: patch.lyricTimes,
      lyrics_language: patch.language,
    }).catch((err) => console.warn('Failed to sync update to server:', err))
  }

  const setStudioOpen = (open: boolean) =>
    setSearchParams((params) => {
      const next = new URLSearchParams(params)
      if (open) next.set('studio', 'true')
      else next.delete('studio')
      return next
    })

  const toggleStudio = () => {
    if (current) return setStudioOpen(!studio)
    const firstId = cards[0]?.id
    if (!firstId) return
    setStem('full')
    setPlaying(false)
    navigate(`/track/${firstId}?studio=true`)
  }

  const addFiles = async (files: File[]) => {
    const audios = files.filter((f) => f.type.startsWith('audio/'))
    if (audios.length < files.length) {
      setSnackbar({ message: 'Only audio files can be uploaded', type: 'error' })
      if (!audios.length) return
    }

    setSnackbar({ message: 'Saving track to Firebase...', type: 'loading' })

    for (const file of audios) {
      try {
        const saved = await createTrack({
          id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: file.name.replace(/\.[^.]+$/, ''),
          artist: 'Unknown artist',
          duration: await getAudioDuration(file),
          audioFile: file,
        })
        setSnackbar({ message: 'Track saved to Firebase!', type: 'success' })
        setCards((list) => [{ ...trackToCard(saved), audioFile: file }, ...list])
      } catch (err) {
        console.error('Failed to save track:', err)
        setSnackbar({ message: 'Failed to save track to Firebase', type: 'error' })
      }
    }
  }

  const removeCard = async (id: string) => {
    if (current?.id === id) {
      setPlaying(false)
      navigate('/')
    }
    setCards((list) => list.filter((c) => c.id !== id))
    setMenu(null)
    try {
      await deleteTrack(id)
      setSnackbar({ message: 'Track and files deleted successfully', type: 'success' })
    } catch (err) {
      console.error('Failed to delete track:', err)
      setSnackbar({ message: 'Failed to delete track from server', type: 'error' })
    }
  }

  const handleCloseSnackbar = useCallback(() => setSnackbar(null), [])

  const seekLine = (i: number) => {
    const t = current?.lyricTimes?.[i]
    if (isValidTime(t)) seek(t)
  }

  return (
    <main className="relative h-screen w-full overflow-hidden bg-white text-neutral-900">
      <TopSnackbar snackbar={snackbar} onClose={handleCloseSnackbar} />

      {!loading && cards.length === 0 && (
        <EmptyState title="No tracks yet" description="Add a new track by clicking the + button below" />
      )}

      <LiquidScene
        cards={cards}
        onPlay={openTrack}
        onMenu={(card, x, y) => setMenu({ card, x, y })}
        lyrics={current ? { lines, active: activeLine, card: current } : null}
        onSeekLine={seekLine}
      />

      <button
        type="button"
        onClick={() => navigate('/')}
        className="fixed top-6 left-6 z-10 text-xs font-semibold tracking-[0.22em] uppercase select-none cursor-pointer sm:top-7 sm:left-7"
      >
        LYRICS
      </button>

      <span className="pointer-events-none fixed top-6 right-6 z-10 text-xs font-semibold tracking-[0.22em] uppercase select-none sm:top-7 sm:right-7">
        STUDIO
      </span>

      {current && (
        <button
          type="button"
          aria-label="Open Studio"
          title="Studio"
          aria-pressed={studio}
          onClick={toggleStudio}
          className="group fixed top-1/2 right-0 z-10 grid h-14 w-2 -translate-y-1/2 place-items-center overflow-hidden rounded-l-xl bg-[#ff4a1c] text-white transition-all duration-300 hover:w-11 focus-visible:w-11 focus-visible:outline-none cursor-pointer"
        >
          <SlidersIcon
            width={18}
            height={18}
            className="translate-x-2 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
          />
        </button>
      )}

      {menu && (
        <CardMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          onStudio={() => {
            setMenu(null)
            openTrack(menu.card, true)
          }}
          onDelete={() => removeCard(menu.card.id)}
        />
      )}

      {current && studio && (
        <StudioPanel
          card={current}
          time={time}
          playing={playing}
          stem={stem}
          onStem={setStem}
          onUpdate={(patch) => updateCard(current.id, patch)}
          onSeek={seek}
          onTogglePlay={togglePlay}
          onClose={() => setStudioOpen(false)}
        />
      )}

      <FloatingNav
        cards={cards}
        onFiles={addFiles}
        onPick={openTrack}
        player={
          current
            ? { playing, time, duration, onSeek: seek, onToggle: togglePlay, onPrev: prev, onNext: () => step(1) }
            : undefined
        }
      />
    </main>
  )
}
