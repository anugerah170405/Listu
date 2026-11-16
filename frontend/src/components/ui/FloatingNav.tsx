import { useEffect, useRef, useState } from 'react'
import {
    FileTextIcon as DocumentIcon,
    Maximize2Icon as ExpandIcon,
    LogOutIcon as LogoutIcon,
    SkipForwardIcon as NextIcon,
    PauseIcon,
    PlayIcon,
    PlusIcon,
    SkipBackIcon as PrevIcon,
    SearchIcon,
    Minimize2Icon as ShrinkIcon,
    UserIcon,
} from 'lucide-react'
import type { Card, PlayerState } from '../../types'
import NavButton from './NavButton'
import ProgressLine from './ProgressLine'

function Thumb({ card }: { card: Card }) {
    return (
        <span className="relative block h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-neutral-800">
            {card.src ? (
                <img src={card.src} alt="" draggable={false} className="h-full w-full object-cover" />
            ) : (
                <span className="block h-full w-full bg-neutral-700" />
            )}
            <span className="absolute inset-0 grid place-items-center bg-black/50 text-white opacity-0 transition-opacity duration-200 group-hover/row:opacity-100">
                <PlayIcon width={16} height={16} />
            </span>
        </span>
    )
}

const ACCOUNT_ITEMS = [
    { label: 'Akun', Icon: UserIcon },
    { label: 'Syarat dan Ketentuan', Icon: DocumentIcon },
    { label: 'Keluar', Icon: LogoutIcon },
]

type Mode = 'none' | 'search' | 'account'

export default function FloatingNav({
    cards,
    onFiles,
    onPick,
    player,
}: {
    cards: Card[]
    onFiles: (files: File[]) => void
    onPick: (card: Card) => void
    player?: PlayerState
}) {
    const [mode, setMode] = useState<Mode>('none')
    const [content, setContent] = useState<Exclude<Mode, 'none'>>('search')
    const [q, setQ] = useState('')
    const [fullscreen, setFullscreen] = useState(false)
    const wrap = useRef<HTMLDivElement>(null)
    const file = useRef<HTMLInputElement>(null)
    const search = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const on = () => setFullscreen(Boolean(document.fullscreenElement))
        document.addEventListener('fullscreenchange', on)
        return () => document.removeEventListener('fullscreenchange', on)
    }, [])

    const toggleFullscreen = () => {
        const req = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()
        req.catch(() => {})
    }

    const open = (m: Exclude<Mode, 'none'>) => {
        if (mode === m) return setMode('none')
        setContent(m)
        setMode(m)
        if (m === 'search') setTimeout(() => search.current?.focus(), 120)
    }

    useEffect(() => {
        if (mode === 'none') return
        const down = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setMode('none')
        const key = (e: KeyboardEvent) => e.key === 'Escape' && setMode('none')
        window.addEventListener('pointerdown', down)
        window.addEventListener('keydown', key)
        return () => {
            window.removeEventListener('pointerdown', down)
            window.removeEventListener('keydown', key)
        }
    }, [mode])

    const term = q.trim().toLowerCase()
    const results = term ? cards.filter((c) => `${c.title} ${c.artist}`.toLowerCase().includes(term)) : cards
    const expanded = mode !== 'none'
    const width = player
        ? 'w-[min(94vw,360px)]'
        : mode === 'search'
            ? 'w-[min(92vw,340px)]'
            : mode === 'account'
                ? 'w-[min(92vw,250px)]'
                : 'w-[144px]'

    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-8 z-30 flex justify-center px-3">
            <div ref={wrap} className="pointer-events-auto flex flex-col items-center">
                <input
                    ref={file}
                    type="file"
                    accept="audio/*,image/*"
                    multiple
                    hidden
                    onChange={(e) => {
                        const files = Array.from(e.target.files ?? [])
                        if (files.length) onFiles(files)
                        e.target.value = ''
                    }}
                />

                <div className={`${width} relative rounded-[26px] bg-[#0d0d0d] text-white shadow-[0_14px_40px_-10px_rgba(0,0,0,0.6)] transition-[width] duration-500 ease-[cubic-bezier(0.3,1,0.3,1)]`}>
                    <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.3,1,0.3,1)] ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                        <div className="overflow-hidden rounded-t-[32px]">
                            {content === 'search' ? (
                                <div className="p-2 pb-0">
                                    <div className="flex items-center gap-2.5 rounded-full bg-white/8 px-3.5 py-2.5">
                                        <SearchIcon width={18} height={18} className="shrink-0 text-white/55" />
                                        <input
                                            ref={search}
                                            value={q}
                                            onChange={(e) => setQ(e.target.value)}
                                            placeholder="Search songs or artists"
                                            className="w-full bg-transparent text-[15px] outline-none placeholder:text-white/40"
                                        />
                                    </div>
                                    <ul className="mt-1 h-44 overflow-y-auto py-1">
                                        {!results.length && <li className="grid h-full place-items-center text-[13px] text-white/40">Tidak ada hasil</li>}
                                        {results.map((c) => (
                                            <li key={c.id}>
                                                <button
                                                    onClick={() => { setMode('none'); onPick(c) }}
                                                    className="group/row flex w-full items-center gap-3 rounded-2xl px-2 py-1.5 text-left transition-colors hover:bg-white/10 cursor-pointer"
                                                >
                                                    <Thumb card={c} />
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-[13px] font-medium">{c.title}</span>
                                                        <span className="block truncate text-[12px] text-white/50">{c.artist}</span>
                                                    </span>
                                                    <span className="text-[12px] text-white/40 tabular-nums">{c.duration}</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : (
                                <div className="p-2 pb-0">
                                    <ul className="py-1">
                                        {ACCOUNT_ITEMS.map(({ label, Icon }) => (
                                            <li key={label}>
                                                <button
                                                    onClick={() => setMode('none')}
                                                    className={`flex w-full items-center gap-4 rounded-full px-3.5 py-2.5 text-[13px] transition-colors hover:bg-white/10 cursor-pointer ${label === 'Keluar' ? 'text-[#ff7a57]' : 'text-white/90'}`}
                                                >
                                                    <Icon width={20} height={20} />
                                                    <span className="flex-1 text-left">{label}</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                    {player && !expanded && <ProgressLine time={player.time} duration={player.duration} onSeek={player.onSeek} />}

                    <nav className={`flex animate-[fade-in_0.35s_ease-out] items-center justify-center gap-1 p-1.5 ${player ? 'pt-2' : ''}`}>
                        <NavButton label="Add New" hideTip={expanded} onClick={() => { setMode('none'); file.current?.click() }}>
                            <PlusIcon />
                        </NavButton>
                        <NavButton label="Search" hideTip={expanded} active={mode === 'search'} onClick={() => open('search')}>
                            <SearchIcon />
                        </NavButton>

                        {player && (
                            <>
                                <span className="mx-1.5 h-6 w-px bg-white/15" />
                                <NavButton label="Previous" hideTip={expanded} onClick={player.onPrev}>
                                    <PrevIcon />
                                </NavButton>
                                <button
                                    type="button"
                                    aria-label={player.playing ? 'Pause' : 'Play'}
                                    onClick={player.onToggle}
                                    className="grid h-11 w-11 place-items-center rounded-full bg-white text-neutral-900 transition-transform duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                                >
                                    {player.playing ? <PauseIcon width={20} height={20} /> : <PlayIcon width={20} height={20} className="ml-0.5" />}
                                </button>
                                <NavButton label="Next" hideTip={expanded} onClick={player.onNext}>
                                    <NextIcon />
                                </NavButton>
                                <span className="mx-1.5 h-6 w-px bg-white/15" />
                            </>
                        )}

                        <NavButton label="Account" hideTip={expanded} active={mode === 'account'} onClick={() => open('account')}>
                            <UserIcon />
                        </NavButton>

                        {player && (
                            <NavButton label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'} hideTip={expanded} onClick={toggleFullscreen}>
                                {fullscreen ? <ShrinkIcon /> : <ExpandIcon />}
                            </NavButton>
                        )}
                    </nav>
                </div>
            </div>
        </div>
    )
}
