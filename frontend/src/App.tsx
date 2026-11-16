import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useMatch, useSearchParams } from 'react-router-dom'
import { SlidersIcon } from 'lucide-react'
import { usePlayback } from './hooks/usePlayback'
import type { Stem, Card } from './types'
import { DEFAULT_CARDS } from './data/mockCards'
import CardMenu from './components/ui/CardMenu'
import FloatingNav from './components/ui/FloatingNav'
import StudioPanel from './components/panel/StudioPanel'
import LiquidScene from './components/scene/LiquidScene'
import { formatTime } from './utils/format'

export default function App() {
  const navigate = useNavigate()
  const match = useMatch('/track/:trackId')
  const playId = match?.params.trackId ?? null
  const [searchParams, setSearchParams] = useSearchParams()
  const studio = searchParams.get('studio') === 'true'

  const [cards, setCards] = useState<Card[]>(DEFAULT_CARDS)
  const [playing, setPlaying] = useState(false)
  const [menu, setMenu] = useState<{ card: Card; x: number; y: number } | null>(null)
  const [stem, setStem] = useState<Stem>('full')

  const current = cards.find((c) => c.id === playId)
  const index = current ? cards.indexOf(current) : -1

  // Redirect to home if track ID in URL is invalid
  useEffect(() => {
    if (playId && !current) {
      navigate('/', { replace: true })
    }
  }, [playId, current, navigate])

  const openTrack = (c: Card, openStudio = false) => {
    setStem('full')
    setPlaying(true)
    navigate(openStudio ? `/track/${c.id}?studio=true` : `/track/${c.id}`)
  }

  const step = (dir: number) => {
    if (index >= 0) {
      const nextCard = cards[(index + dir + cards.length) % cards.length]
      openTrack(nextCard, studio)
    }
  }

  const activeCard = useMemo(() => {
    if (!current) return undefined
    let audio = current.audio
    if (stem === 'vocal' && current.vocalsAudio) audio = current.vocalsAudio
    else if (stem === 'instrumental' && current.instrumentalAudio) audio = current.instrumentalAudio
    return { ...current, audio }
  }, [current, stem])

  const { time, duration, seek } = usePlayback(activeCard, playing, () => step(1))

  const lines = current?.lyrics ?? []
  const lyricStart = 4
  const lyricStep = lines.length ? Math.max(1, (duration - lyricStart - 6) / lines.length) : 1
  const synced = current?.lyricTimes?.length === lines.length ? current.lyricTimes : null
  const lineStart = (i: number) => (synced ? synced[i] : lyricStart + i * lyricStep)

  let activeLine = -1
  for (let i = 0; i < lines.length; i++) {
    if (time >= lineStart(i)) activeLine = i
  }

  const updateCard = (id: string, patch: Partial<Card>) =>
    setCards((c) => c.map((x) => (x.id === id ? { ...x, ...patch } : x)))

  const prev = () => (time > 3 ? seek(0) : step(-1))

  const toggleStudio = () => {
    if (current) {
      setSearchParams((prevParams) => {
        const next = new URLSearchParams(prevParams)
        if (studio) next.delete('studio')
        else next.set('studio', 'true')
        return next
      })
    } else {
      setStem('full')
      setPlaying(false)
      const firstId = cards[0]?.id
      if (firstId) navigate(`/track/${firstId}?studio=true`)
    }
  }

  const closeStudio = () => {
    setSearchParams((prevParams) => {
      const next = new URLSearchParams(prevParams)
      next.delete('studio')
      return next
    })
  }

  useEffect(() => {
    if (!current) return
    const key = (e: KeyboardEvent) => e.key === 'Escape' && navigate('/')
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [current, navigate])

  const addFiles = (files: File[]) => {
    const cover = files.find((f) => f.type.startsWith('image/'))
    const coverUrl = cover ? URL.createObjectURL(cover) : undefined
    const audios = files.filter((f) => f.type.startsWith('audio/'))

    const fresh: Card[] = audios.map((f, i) => ({
      id: `u-${Date.now()}-${i}`,
      title: f.name.replace(/\.[^.]+$/, ''),
      artist: 'Unknown artist',
      duration: '--:--',
      src: coverUrl,
      audio: URL.createObjectURL(f),
      audioFile: f
    }))

    if (!fresh.length && coverUrl && cover) {
      fresh.push({
        id: `u-${Date.now()}`,
        title: cover.name.replace(/\.[^.]+$/, ''),
        artist: 'Unknown artist',
        duration: '--:--',
        src: coverUrl,
      })
    }

    if (!fresh.length) return
    setCards((c) => [...fresh, ...c])

    fresh.forEach((card) => {
      if (!card.audio) return
      const a = new Audio(card.audio)
      a.addEventListener('loadedmetadata', () => {
        updateCard(card.id, { duration: formatTime(a.duration) })
      })
    })
  }

  return (
    <main className="relative h-screen w-full overflow-hidden bg-white text-neutral-900">
      <LiquidScene
        cards={cards}
        onPlay={openTrack}
        onMenu={(card, x, y) => setMenu({ card, x, y })}
        lyrics={current ? { lines, active: activeLine, card: current } : null}
        onSeekLine={(i) => seek(lineStart(i))}
      />

      {/* Direct Corner Navigation Controls without unnecessary arrays or mapping */}
      <button
        type="button"
        onClick={() => navigate('/')}
        className="fixed top-6 left-6 z-10 text-[11px] font-semibold tracking-[0.22em] uppercase select-none cursor-pointer sm:top-7 sm:left-7"
      >
        LISTU
      </button>

      <span className="pointer-events-none fixed top-6 right-6 z-10 text-[11px] font-semibold tracking-[0.22em] uppercase select-none sm:top-7 sm:right-7">
        STUDIO
      </span>

      {/* Studio tab attached to the right edge */}
      {current && (
        <button
          type="button"
          aria-label="Buka Studio"
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
          onDelete={() => {
            setCards((c) => c.filter((x) => x.id !== menu.card.id))
            setMenu(null)
          }}
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
          onTogglePlay={() => setPlaying((p) => !p)}
          onClose={closeStudio}
        />
      )}

      <FloatingNav
        cards={cards}
        onFiles={addFiles}
        onPick={openTrack}
        player={
          current
            ? { playing, time, duration, onSeek: seek, onToggle: () => setPlaying((p) => !p), onPrev: prev, onNext: () => step(1) }
            : undefined
        }
      />
    </main>
  )
}
