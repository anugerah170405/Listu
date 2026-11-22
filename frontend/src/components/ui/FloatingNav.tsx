import { useEffect, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react'
import {
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
    Loader2Icon,
    MusicIcon,
    SearchXIcon,
} from 'lucide-react'
import type { Card, PlayerState } from '../../types'
import { useAuth } from '../../context/AuthContext'
import { showSnackbar } from '../../utils/snackbar'
import { formatTime } from '../../utils/format'

function NavButton({
    label,
    active,
    hideTip,
    onClick,
    children,
}: {
    label: string
    active?: boolean
    hideTip?: boolean
    onClick: () => void
    children: ReactNode
}) {
    return (
        <div className="group relative">
            <span
                className={`pointer-events-none absolute bottom-full left-1/2 mb-4 -translate-x-1/2 translate-y-1 rounded-full bg-white px-4 py-2 text-xs font-medium whitespace-nowrap text-neutral-900 opacity-0 shadow-[0_6px_24px_rgba(0,0,0,0.14)] ring-1 ring-black/5 transition-all duration-200 ${hideTip ? '' : 'group-hover:translate-y-0 group-hover:opacity-100'}`}
            >
                {label}
            </span>
            <button
                type="button"
                aria-label={label}
                aria-pressed={active}
                onClick={onClick}
                className={`grid h-10 w-10 place-items-center rounded-full text-white transition-colors duration-200 hover:bg-white/10 cursor-pointer [&_svg]:h-5 [&_svg]:w-5 ${active ? 'bg-white/10' : ''}`}
            >
                {children}
            </button>
        </div>
    )
}

function ProgressLine({
    time,
    duration,
    onSeek,
}: {
    time: number
    duration: number
    onSeek: (t: number) => void
}) {
    const bar = useRef<HTMLDivElement>(null)
    const dragging = useRef(false)
    const [hover, setHover] = useState(false)
    const ratio = duration > 0 ? Math.min(1, time / duration) : 0

    const seekFrom = (e: ReactPointerEvent) => {
        if (!bar.current) return
        const r = bar.current.getBoundingClientRect()
        onSeek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * duration)
    }

    return (
        <div
            ref={bar}
            role="slider"
            aria-label="Progress"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(time)}
            className="group absolute inset-x-5 top-0 z-10 h-3 cursor-pointer touch-none"
            onPointerEnter={() => setHover(true)}
            onPointerLeave={() => setHover(false)}
            onPointerDown={(e) => {
                dragging.current = true
                e.currentTarget.setPointerCapture(e.pointerId)
                seekFrom(e)
            }}
            onPointerMove={(e) => dragging.current && seekFrom(e)}
            onPointerUp={() => (dragging.current = false)}
        >
            <div className="h-[3px] w-full rounded-full bg-white/20 transition-[height] duration-200 group-hover:h-[5px]">
                <div className="h-full rounded-full bg-white" style={{ width: `${ratio * 100}%` }} />
            </div>
            <span
                className="absolute top-[1.5px] h-3 w-3 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full bg-white shadow transition-transform group-hover:scale-100"
                style={{ left: `${ratio * 100}%` }}
            />
            <span
                className={`pointer-events-none absolute bottom-full mb-2 -translate-x-1/2 rounded-full bg-white px-2.5 py-1 text-xs font-medium whitespace-nowrap text-neutral-900 tabular-nums shadow-[0_6px_24px_rgba(0,0,0,0.14)] ring-1 ring-black/5 transition-opacity duration-150 ${hover ? 'opacity-100' : 'opacity-0'}`}
                style={{ left: `${ratio * 100}%` }}
            >
                {formatTime(time)} / {formatTime(duration)}
            </span>
        </div>
    )
}

function GoogleIcon({ className = 'h-4 w-4' }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24">
            <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
        </svg>
    )
}

function Thumb({ card }: { card: Card }) {
    return (
        <span className="relative block h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-neutral-850 ring-1 ring-white/10">
            {card.src ? (
                <img src={card.src} alt="" draggable={false} className="h-full w-full object-cover" />
            ) : (
                <span className="flex h-full w-full items-center justify-center bg-neutral-800 text-white/40">
                    <MusicIcon width={16} height={16} />
                </span>
            )}
            <span className="absolute inset-0 grid place-items-center bg-black/50 text-white opacity-0 transition-opacity duration-200 group-hover/row:opacity-100">
                <PlayIcon width={16} height={16} />
            </span>
        </span>
    )
}

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
    const { user, profile, loading: authLoading, signInWithGoogle, signOut } = useAuth()
    const [mode, setMode] = useState<Mode>('none')
    const [isSigningIn, setIsSigningIn] = useState(false)
    const [content, setContent] = useState<Exclude<Mode, 'none'>>('search')
    const [searchQuery, setSearchQuery] = useState('')
    const [fullscreen, setFullscreen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const handleFullscreenChange = () => setFullscreen(Boolean(document.fullscreenElement))
        document.addEventListener('fullscreenchange', handleFullscreenChange)
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }, [])

    const toggleFullscreen = () => {
        const req = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()
        req.catch(() => { })
    }

    const handleToggleMode = (targetMode: Exclude<Mode, 'none'>) => {
        if (mode === targetMode) return setMode('none')
        setContent(targetMode)
        setMode(targetMode)
        if (targetMode === 'search') setTimeout(() => searchInputRef.current?.focus(), 120)
    }

    useEffect(() => {
        if (mode === 'none') return
        const handleClickOutside = (e: PointerEvent) => !containerRef.current?.contains(e.target as Node) && setMode('none')
        const handleKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && setMode('none')
        window.addEventListener('pointerdown', handleClickOutside)
        window.addEventListener('keydown', handleKeyDown)
        return () => {
            window.removeEventListener('pointerdown', handleClickOutside)
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [mode])

    const term = searchQuery.trim().toLowerCase()
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
            <div ref={containerRef} className="pointer-events-auto flex flex-col items-center">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
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
                                            ref={searchInputRef}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search songs or artists"
                                            className="w-full bg-transparent text-sm outline-none placeholder:text-white/40"
                                        />
                                    </div>
                                    <ul className="mt-1 h-44 overflow-y-auto py-1">
                                        {!results.length && (
                                            <li className="grid h-full place-items-center py-4 text-xs text-white/40">
                                                <div className="flex flex-col items-center gap-2">
                                                    <SearchXIcon width={24} height={24} className="text-white/30" />
                                                    <span>No results found</span>
                                                </div>
                                            </li>
                                        )}
                                        {results.map((c) => (
                                            <li key={c.id}>
                                                <button
                                                    onClick={() => { setMode('none'); onPick(c) }}
                                                    className="group/row flex w-full items-center gap-3 rounded-2xl px-2 py-1.5 text-left transition-colors hover:bg-white/10 cursor-pointer"
                                                >
                                                    <Thumb card={c} />
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-sm font-medium">{c.title}</span>
                                                        <span className="block truncate text-xs text-white/50">{c.artist}</span>
                                                    </span>
                                                    <span className="text-xs text-white/40 tabular-nums">{c.duration}</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : authLoading ? (
                                <div className="flex h-36 items-center justify-center p-3">
                                    <Loader2Icon className="h-5 w-5 animate-spin text-white/50" />
                                </div>
                            ) : !user ? (
                                <div className="p-3 text-center">
                                    <div className="mb-2.5 flex justify-center">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.07] text-white/70 ring-1 ring-white/10">
                                            <UserIcon width={20} height={20} />
                                        </div>
                                    </div>
                                    <div className="mb-3 px-1 text-center">
                                        <p className="text-sm font-semibold text-white">Sign In to Listu</p>
                                        <p className="mt-0.5 text-xs text-white/50">Save and sync your tracks across devices</p>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={isSigningIn}
                                        onClick={async () => {
                                            if (isSigningIn) return
                                            setIsSigningIn(true)
                                            try {
                                                await signInWithGoogle()
                                                setMode('none')
                                            } catch (err: unknown) {
                                                const error = err as { code?: string; message?: string }
                                                if (
                                                    error?.code === 'auth/cancelled-popup-request' ||
                                                    error?.code === 'auth/popup-closed-by-user'
                                                ) {
                                                    return
                                                }
                                                if (error?.code === 'auth/unauthorized-domain') {
                                                    showSnackbar('Domain is not authorized in Firebase. Make sure to open via localhost:5173', 'error')
                                                    return
                                                }
                                                const msg = error?.message || 'Failed to sign in'
                                                showSnackbar(msg, 'error')
                                            } finally {
                                                setIsSigningIn(false)
                                            }
                                        }}
                                        className={`flex w-full items-center justify-center gap-2.5 rounded-full bg-white px-4 py-2.5 text-xs font-semibold text-neutral-900 transition-all duration-200 shadow-sm ${isSigningIn ? 'opacity-70 cursor-not-allowed' : 'hover:bg-neutral-100 hover:scale-[1.02] active:scale-[0.98] cursor-pointer'}`}
                                    >
                                        {isSigningIn ? (
                                            <Loader2Icon className="h-4 w-4 animate-spin text-neutral-600" />
                                        ) : (
                                            <GoogleIcon className="h-4 w-4 shrink-0" />
                                        )}
                                        <span>{isSigningIn ? 'Signing in...' : 'Continue with Google'}</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="p-2 pb-0">
                                    <div className="flex items-center gap-3 px-3 py-2 border-b border-white/10 mb-1">
                                        {user.photoURL ? (
                                            <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full object-cover ring-1 ring-white/20" />
                                        ) : (
                                            <div className="h-8 w-8 rounded-full bg-neutral-700 grid place-items-center text-white text-xs font-bold">
                                                {user.displayName?.[0] || 'U'}
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-white">{user.displayName || 'Google User'}</p>
                                            <p className="truncate text-xs text-white/50">{user.email}</p>
                                        </div>
                                    </div>
                                    <ul className="py-1">
                                        <li>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    try {
                                                        await signOut()
                                                        setMode('none')
                                                        showSnackbar('Signed out', 'success')
                                                    } catch (err: unknown) {
                                                        const msg = err instanceof Error ? err.message : 'Failed to sign out'
                                                        showSnackbar(msg, 'error')
                                                    }
                                                }}
                                                className="flex w-full items-center gap-3.5 rounded-full px-3.5 py-2.5 text-sm transition-colors hover:bg-white/10 cursor-pointer text-[#ff7a57]"
                                            >
                                                <LogoutIcon width={18} height={18} />
                                                <span className="flex-1 text-left">Log Out</span>
                                            </button>
                                        </li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                    {player && !expanded && <ProgressLine time={player.time} duration={player.duration} onSeek={player.onSeek} />}

                    <nav className={`flex animate-[fade-in_0.35s_ease-out] items-center justify-center gap-1 p-1.5 ${player ? 'pt-2' : ''}`}>
                        <NavButton
                            label="Add New"
                            hideTip={expanded}
                            onClick={() => {
                                if (!user) {
                                    showSnackbar('Please sign in with Google to upload tracks', 'error')
                                    handleToggleMode('account')
                                    return
                                }
                                setMode('none')
                                fileInputRef.current?.click()
                            }}
                        >
                            <PlusIcon />
                        </NavButton>
                        <NavButton label="Search" hideTip={expanded} active={mode === 'search'} onClick={() => handleToggleMode('search')}>
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

                        <NavButton label={profile?.displayName || 'Account'} hideTip={expanded} active={mode === 'account'} onClick={() => handleToggleMode('account')}>
                            {profile?.photoURL ? (
                                <img src={profile.photoURL} alt="" referrerPolicy="no-referrer" className="h-5 w-5 rounded-full object-cover ring-1 ring-white/30" />
                            ) : (
                                <UserIcon />
                            )}
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
