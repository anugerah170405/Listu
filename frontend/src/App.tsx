import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useMatch, useSearchParams } from 'react-router-dom'
import { SlidersIcon, MusicIcon, UserIcon } from 'lucide-react'
import { usePlayback } from './hooks/usePlayback'
import { useTaskSync } from './hooks/useTaskSync'
import { type Stem, type Card } from './types'
import { useAuth } from './context/AuthContext'
import CardMenu from './components/ui/CardMenu'
import FloatingNav from './components/ui/FloatingNav'
import StudioPanel from './components/panel/StudioPanel'
import LiquidScene from './components/scene/LiquidScene'
import { fetchTracks, createTrack, deleteTrack, updateTrackMetadata, trackToCard, type UpdateTrackPayload } from './services/api'
import TopSnackbar from './components/ui/TopSnackbar'
import EmptyState from './components/ui/EmptyState'
import { showSnackbar, hideSnackbar } from './utils/snackbar'
import { getAudioDuration } from './utils/audio'
import { findActiveLine, isValidTime } from './utils/lyrics'

const STEM_SOURCE = {
  vocal: 'vocalsAudio',
  instrumental: 'instrumentalAudio',
} as const

const CARDS_CACHE_KEY = 'listu:cards_cache'

function readCachedCards(): Card[] {
  try {
    const raw = localStorage.getItem(CARDS_CACHE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (err) {
    console.debug('Failed to read cached cards:', err)
    return []
  }
}

function writeCachedCards(cards: Card[]) {
  try {
    localStorage.setItem(CARDS_CACHE_KEY, JSON.stringify(cards))
  } catch (err) {
    console.debug('Failed to cache cards:', err)
  }
}

function clearCachedCards() {
  try {
    localStorage.removeItem(CARDS_CACHE_KEY)
  } catch (err) {
    console.debug('Failed to clear cached cards:', err)
  }
}

export default function App() {
  const navigate = useNavigate()
  const { user, profile, loading: authLoading } = useAuth()
  const match = useMatch('/track/:trackId')
  const playId = match?.params.trackId ?? null
  const [searchParams, setSearchParams] = useSearchParams()
  const studio = searchParams.get('studio') === 'true'
  const [cards, setCards] = useState<Card[]>(readCachedCards)
  const [loadedUid, setLoadedUid] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [menu, setMenu] = useState<{ card: Card; x: number; y: number } | null>(null)
  const [stem, setStem] = useState<Stem>('full')

  const isAuthenticated = Boolean(user || profile)
  const loading = Boolean(user && loadedUid !== user.uid)
  const isInitializing = authLoading || loading
  const current = cards.find((c) => c.id === playId)
  const index = current ? cards.indexOf(current) : -1

  useTaskSync({
    cards,
    setCards,
    enabled: Boolean(user && !authLoading),
  })

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setCards([])
      setLoadedUid(null)
      clearCachedCards()
      hideSnackbar()
      return
    }

    let cancelled = false
    showSnackbar('Loading data', 'loading')
    fetchTracks()
      .then((tracks) => {
        if (cancelled) return
        const freshCards = tracks.map(trackToCard)
        setCards(freshCards)
        writeCachedCards(freshCards)
        hideSnackbar()
      })
      .catch((err) => {
        if (cancelled) return
        console.warn(err.message, err)
        showSnackbar(err.message, 'error')
      })
      .finally(() => {
        if (!cancelled) setLoadedUid(user.uid)
      })

    return () => {
      cancelled = true
    }
  }, [user, authLoading])

  useEffect(() => {
    if (isAuthenticated) {
      writeCachedCards(cards)
    }
  }, [cards, isAuthenticated])

  useEffect(() => {
    if (!isInitializing && playId && !current) navigate('/', { replace: true })
  }, [isInitializing, playId, current, navigate])

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

  const METADATA_KEYS: (keyof Card)[] = ['title', 'artist', 'src', 'genre', 'lyrics', 'lyricTimes', 'language']

  const updateCard = (id: string, patch: Partial<Card>) => {
    setCards((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)))
    if (!METADATA_KEYS.some((key) => key in patch)) return

    const payload: UpdateTrackPayload = {}
    if ('title' in patch) payload.title = patch.title
    if ('artist' in patch) payload.artist = patch.artist
    if ('src' in patch) payload.cover_url = patch.src ?? null
    if ('genre' in patch) payload.genre = patch.genre ?? null
    if ('lyrics' in patch) payload.lyrics_lines = patch.lyrics
    if ('lyricTimes' in patch) payload.lyrics_times = patch.lyricTimes
    if ('language' in patch) payload.lyrics_language = patch.language ?? null

    updateTrackMetadata(id, payload).catch((err) => {
      console.warn('Failed to sync update to server:', err)
      showSnackbar('Failed to sync changes to server', 'error')
    })
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
    if (!user) {
      showSnackbar('Please sign in with Google to upload tracks', 'error')
      return
    }

    const audios = files.filter((f) => f.type.startsWith('audio/'))
    if (audios.length < files.length) {
      showSnackbar('Only audio files can be uploaded', 'error')
      if (!audios.length) return
    }

    showSnackbar('Uploading track...', 'loading')

    for (const file of audios) {
      try {
        const saved = await createTrack({
          id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: file.name.replace(/\.[^.]+$/, ''),
          artist: 'Unknown artist',
          duration: await getAudioDuration(file),
          audioFile: file,
        })
        showSnackbar('Track uploaded successfully!', 'success')
        setCards((list) => [{ ...trackToCard(saved), audioFile: file }, ...list])
      } catch (err) {
        console.error('Failed to upload track:', err)
        showSnackbar(err, 'error')
      }
    }
  }

  const removeCard = async (id: string) => {
    if (current?.id === id) {
      setPlaying(false)
      navigate('/')
    }
    const nextCards = cards.filter((c) => c.id !== id)
    setCards(nextCards)
    writeCachedCards(nextCards)
    setMenu(null)
    try {
      await deleteTrack(id)
      showSnackbar('Track and files deleted successfully', 'success')
    } catch (err) {
      console.error('Failed to delete track:', err)
      showSnackbar('Failed to delete track from server', 'error')
    }
  }

  const seekLine = (i: number) => {
    const t = current?.lyricTimes?.[i]
    if (isValidTime(t)) seek(t)
  }

  return (
    <main className="relative h-screen w-full overflow-hidden bg-white text-neutral-900">
      <TopSnackbar />

      {cards.length === 0 && (!isInitializing || Boolean(profile)) && (
        <EmptyState
          icon={isAuthenticated ? MusicIcon : UserIcon}
          title={isAuthenticated ? 'No tracks yet' : 'Sign in to Listu'}
          description={
            isAuthenticated
              ? 'Add a new track by clicking the + button below'
              : 'Sign in with Google from the bottom bar (Account) to view and manage your tracks.'
          }
        />
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
          cards={cards}
          time={time}
          playing={playing}
          stem={stem}
          onStem={setStem}
          onUpdate={(patch, targetId) => updateCard(targetId ?? current.id, patch)}
          onCreatedTrack={(newCard) => {
            setCards((list) => [newCard, ...list])
          }}
          onDeleteTrack={(targetId) => removeCard(targetId ?? current.id)}
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
