import { useState, useRef, useEffect, type ClipboardEvent } from 'react'
import type { Card } from '../../../types'
import {
    ChevronDownIcon,
    PauseIcon,
    PlayIcon,
    PlusIcon,
    RefreshCcw,
    RotateCcwIcon,
    SparklesIcon,
    Trash2Icon,
} from 'lucide-react'
import { generateTrackLyrics } from '../../../services/api'
import { formatTime } from '../../../utils/format'
import { isValidTime, parseLyrics } from '../../../utils/lyrics'
import { showSnackbar } from '../../../utils/snackbar'
import Button from '../../ui/Button'
import IconButton from '../../ui/IconButton'

const LANGUAGE_OPTIONS = [
    { value: '', label: '🌐 Auto' },
    { value: 'id', label: '🇮🇩 Indonesian' },
    { value: 'en', label: '🇬🇧 English' },
    { value: 'ja', label: '🇯🇵 Japanese' },
    { value: 'ko', label: '🇰🇷 Korean' },
    { value: 'zh', label: '🇨🇳 Mandarin' },
    { value: 'es', label: '🇪🇸 Spanish' },
    { value: 'fr', label: '🇫🇷 French' },
]

function LanguageSelect({
    value,
    onChange,
    disabled,
    title,
    className = '',
}: {
    value: string
    onChange: (value: string) => void
    disabled?: boolean
    title?: string
    className?: string
}) {
    return (
        <div className={`relative shrink-0 ${className}`.trim()}>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                title={title}
                className="w-full cursor-pointer appearance-none rounded-full bg-white/[0.08] py-2.5 pr-9 pl-4 text-xs font-medium text-white outline-none transition-all duration-200 hover:bg-white/[0.13] focus-visible:bg-white/[0.13] disabled:cursor-not-allowed disabled:opacity-40"
            >
                {LANGUAGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-neutral-900 text-white">
                        {opt.label}
                    </option>
                ))}
            </select>
            <ChevronDownIcon
                width={14}
                height={14}
                className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-white/50"
            />
        </div>
    )
}

type LyricsToolProps = {
    card: Card
    time: number
    playing: boolean
    onUpdate: (patch: Partial<Card>, targetId?: string) => void
    onSeek: (timestamp: number) => void
    onTogglePlay: () => void
}

type Timestamps = (number | null | undefined)[]

const NUDGE_STEP = 0.2
const round1 = (n: number) => Math.round(n * 10) / 10

function parseTimeInput(raw: string): number | null | undefined {
    const clean = raw.trim()
    if (!clean || clean === '--:--.-') return null

    const mmss = clean.match(/^(\d+):(\d+(?:\.\d+)?)$/)
    if (mmss) {
        const minutes = parseInt(mmss[1], 10)
        const seconds = parseFloat(mmss[2])
        if (seconds < 60) return round1(Math.max(0, minutes * 60 + seconds))
    }

    if (/^\d+(?:\.\d+)?$/.test(clean)) {
        return round1(Math.max(0, parseFloat(clean)))
    }

    return undefined
}

export default function LyricsTool({ card, time, playing, onUpdate, onSeek, onTogglePlay }: LyricsToolProps) {
    const [lines, setLines] = useState<string[]>(card.lyrics ?? [])
    const [timestamps, setTimestamps] = useState<Timestamps>(card.lyricTimes ?? [])
    const [selectedLang, setSelectedLang] = useState(card.language ?? '')
    const [activeLineIndex, setActiveLineIndex] = useState(0)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const isGenerating = Boolean(
        isSubmitting || card.processing?.lyrics?.status === 'processing'
    )
    const hasLyrics = Boolean(lines.length > 0)
    const [editingTime, setEditingTime] = useState<{ index: number; value: string } | null>(null)
    const [pendingFocusIndex, setPendingFocusIndex] = useState<number | null>(null)

    const itemRefs = useRef<(HTMLLIElement | null)[]>([])
    const textInputRefs = useRef<(HTMLInputElement | null)[]>([])
    const lastExternalKeyRef = useRef('')

    useEffect(() => {
        const externalKey = JSON.stringify([card.lyrics ?? [], card.lyricTimes ?? [], card.language ?? ''])
        if (externalKey === lastExternalKeyRef.current) return
        lastExternalKeyRef.current = externalKey
        setLines(card.lyrics ?? [])
        setTimestamps(card.lyricTimes ?? [])
        setSelectedLang(card.language ?? '')
    }, [card.lyrics, card.lyricTimes, card.language])

    useEffect(() => {
        if (pendingFocusIndex !== null) {
            const input = textInputRefs.current[pendingFocusIndex]
            if (input) {
                input.focus()
                input.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
            }
            setPendingFocusIndex(null)
        }
    }, [pendingFocusIndex, lines.length])

    const normalizeTimestamps = (nextLines: string[], nextTimes: Timestamps): (number | null)[] =>
        Array.from({ length: nextLines.length }, (_, i) => {
            const t = nextTimes[i]
            return isValidTime(t) ? t : null
        })

    const commit = (nextLines: string[], nextTimes: Timestamps, lang?: string) => {
        const normalizedTimes = normalizeTimestamps(nextLines, nextTimes)
        setLines(nextLines)
        setTimestamps(normalizedTimes)
        onUpdate({
            lyrics: nextLines,
            lyricTimes: normalizedTimes,
            ...(lang !== undefined && { language: lang || undefined }),
        })
    }

    const handleGenerateLyrics = async () => {
        const targetId = card.id
        if (!targetId || (!card.audio && !card.vocalsAudio)) {
            showSnackbar('Track does not have an audio file for lyrics extraction', 'error')
            return
        }
        if (isGenerating) return

        setIsSubmitting(true)
        onUpdate(
            {
                processing: {
                    ...card.processing,
                    lyrics: { status: 'processing', updated_at: new Date().toISOString() },
                },
            },
            targetId
        )
        try {
            const updated = await generateTrackLyrics(targetId, selectedLang || undefined)
            const newLines = updated.lyrics?.lines ?? []
            const newTimes = updated.lyrics?.line_times ?? []
            setLines(newLines)
            setTimestamps(newTimes)
            if (updated.lyrics?.language) {
                setSelectedLang(updated.lyrics.language)
            }
            onUpdate(
                {
                    lyrics: newLines.length ? newLines : undefined,
                    lyricTimes: newTimes.length ? newTimes : undefined,
                    language: updated.lyrics?.language,
                    processing: updated.processing,
                },
                targetId
            )
            showSnackbar('Lyrics generated and synchronized successfully!', 'success')
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err || 'Failed to generate lyrics')
            onUpdate(
                {
                    processing: {
                        ...card.processing,
                        lyrics: { status: 'failed', error: message, updated_at: new Date().toISOString() },
                    },
                },
                targetId
            )
            showSnackbar(err, 'error')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleAddLine = () => {
        const nextLines = [...lines, '']
        const nextTimes = [...timestamps, null]
        const newIndex = nextLines.length - 1
        setLines(nextLines)
        setTimestamps(nextTimes)
        setActiveLineIndex(newIndex)
        setPendingFocusIndex(newIndex)
        commit(nextLines, nextTimes)
    }

    const selectLine = (index: number) => {
        setActiveLineIndex(index)
        const t = timestamps[index]
        if (isValidTime(t)) onSeek(t)
    }

    const handleLineTextChange = (index: number, value: string) => {
        setLines((prev) => prev.map((l, i) => (i === index ? value : l)))
    }

    const handleLineTextBlur = () => {
        const prevLines = card.lyrics ?? []
        const changed = lines.length !== prevLines.length || lines.some((l, i) => l !== prevLines[i])
        if (changed) commit(lines, timestamps)
    }

    const handleLinePaste = (index: number, e: ClipboardEvent<HTMLInputElement>) => {
        const pasted = e.clipboardData.getData('text')
        if (!pasted.includes('\n')) return

        e.preventDefault()
        const parsed = parseLyrics(pasted)
        if (!parsed.lines.length) return

        const nextLines = [...lines]
        const nextTimes = [...timestamps]
        const parsedTimes = parsed.times ?? parsed.lines.map(() => null)

        nextLines.splice(index, lines[index]?.trim() ? 0 : 1, ...parsed.lines)
        nextTimes.splice(index, lines[index]?.trim() ? 0 : 1, ...parsedTimes)

        commit(nextLines, nextTimes)
    }

    const handleTimeBlur = (index: number) => {
        if (!editingTime || editingTime.index !== index) return
        const parsed = parseTimeInput(editingTime.value)
        setEditingTime(null)

        const current = isValidTime(timestamps[index]) ? timestamps[index] : null
        if (parsed === undefined || parsed === current) return

        const nextTimes = normalizeTimestamps(lines, timestamps)
        nextTimes[index] = parsed
        commit(lines, nextTimes)
        if (isValidTime(parsed)) onSeek(parsed)
    }

    const handleNudgeLine = (index: number, delta: number) => {
        setActiveLineIndex(index)
        const base = isValidTime(timestamps[index]) ? timestamps[index]! : time
        const adjusted = Math.max(0, round1(base + delta))
        const nextTimes = normalizeTimestamps(lines, timestamps)
        nextTimes[index] = adjusted
        commit(lines, nextTimes)
        onSeek(adjusted)
    }

    const handleDeleteLine = (index: number) => {
        const nextLines = lines.filter((_, i) => i !== index)
        const nextTimes = timestamps.filter((_, i) => i !== index)
        const nextActive = Math.max(0, Math.min(activeLineIndex, nextLines.length - 1))
        setActiveLineIndex(nextActive)
        commit(nextLines, nextTimes)
    }

    const handleMarkCurrentLine = () => {
        if (!lines.length || activeLineIndex >= lines.length) return
        const nextTimes = normalizeTimestamps(lines, timestamps)
        nextTimes[activeLineIndex] = round1(time)
        commit(lines, nextTimes)

        if (nextTimes.every((t) => isValidTime(t))) {
            showSnackbar('All lyric lines synchronized!', 'success')
        }
        if (activeLineIndex + 1 < lines.length) {
            const nextIdx = activeLineIndex + 1
            setActiveLineIndex(nextIdx)
            itemRefs.current[nextIdx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
    }

    const handleResetAll = () => {
        const emptyTimes = lines.map(() => null)
        setTimestamps(emptyTimes)
        setActiveLineIndex(0)
        commit(lines, emptyTimes)
        onSeek(0)
        showSnackbar('Lyric timing reset', 'success')
    }

    const safeActiveIndex = lines.length ? Math.min(activeLineIndex, lines.length - 1) : 0
    const activeTime = timestamps[safeActiveIndex]
    const hasAnyTime = timestamps.some((t) => isValidTime(t))
    const isDone = lines.length > 0 && safeActiveIndex >= lines.length - 1 && isValidTime(activeTime)

    const lyrTask = card.processing?.lyrics
    const isFailed = lyrTask?.status === 'failed'

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <LanguageSelect
                    value={selectedLang}
                    onChange={(lang) => {
                        setSelectedLang(lang)
                        onUpdate({ language: lang || undefined })
                    }}
                    disabled={isGenerating}
                    title="Select language for lyrics"
                    className="w-32"
                />
                <Button
                    variant="secondary"
                    size="md"
                    className="flex-1"
                    leftIcon={
                        isFailed ? (
                            <RotateCcwIcon size={14} />
                        ) : !isGenerating && !hasLyrics ? (
                            <SparklesIcon size={14} className="text-yellow-400" />
                        ) : undefined
                    }
                    loading={isGenerating}
                    disabled={isGenerating || hasLyrics}
                    title={
                        hasLyrics
                            ? 'Lyrics already exist. Delete lyrics in Manage Audio & Track to regenerate.'
                            : 'Generate lyrics with AI'
                    }
                    onClick={handleGenerateLyrics}
                >
                    {isGenerating
                        ? 'Generating Lyrics...'
                        : isFailed
                            ? 'Retry Lyrics'
                            : hasLyrics
                                ? 'Lyrics Exist'
                                : 'Generate Lyrics'}
                </Button>
            </div>
            {isFailed && lyrTask?.error && (
                <p className="text-[11px] text-red-400 text-center px-1">
                    {lyrTask.error}
                </p>
            )}

            <div className="space-y-2">
                <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    leftIcon={<PlusIcon size={14} />}
                    onClick={handleAddLine}
                    disabled={isGenerating}
                >
                    Add Line
                </Button>

                {lines.length > 0 ? (
                    <ul className="max-h-60 space-y-1 overflow-y-auto pr-0.5">
                        {lines.map((line, index) => {
                            const isSelected = index === safeActiveIndex
                            const t = timestamps[index]
                            const isEditingThisTime = editingTime?.index === index
                            const timeDisplay = isEditingThisTime
                                ? editingTime.value
                                : isValidTime(t)
                                    ? formatTime(t, true)
                                    : ''

                            return (
                                <li
                                    key={index}
                                    ref={(el) => {
                                        itemRefs.current[index] = el
                                    }}
                                    onClick={() => selectLine(index)}
                                    className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs transition-colors ${isSelected
                                        ? 'bg-white/15 ring-1 ring-white/20'
                                        : 'bg-white/[0.03] hover:bg-white/[0.08]'
                                        }`}
                                >
                                    <input
                                        type="text"
                                        value={timeDisplay}
                                        placeholder="--:--.-"
                                        disabled={isGenerating}
                                        aria-label={`Line ${index + 1} timestamp`}
                                        onFocus={() => {
                                             selectLine(index)
                                             setEditingTime({
                                                 index,
                                                 value: isValidTime(t) ? formatTime(t, true) : '',
                                             })
                                        }}
                                        onChange={(e) => setEditingTime({ index, value: e.target.value })}
                                        onBlur={() => handleTimeBlur(index)}
                                        onKeyDown={(e) => {
                                             if (e.key === 'Enter') e.currentTarget.blur()
                                        }}
                                        className={`w-14 shrink-0 rounded bg-transparent px-1 py-0.5 font-mono text-[11px] tabular-nums outline-none transition-colors focus:bg-black/40 focus:ring-1 focus:ring-yellow-400/50 ${isValidTime(t) ? 'text-yellow-400/90' : 'text-white/35 placeholder:text-white/25'
                                            }`}
                                    />

                                    <input
                                        ref={(el) => {
                                            textInputRefs.current[index] = el
                                        }}
                                        type="text"
                                        value={line}
                                        placeholder={`Line #${index + 1}...`}
                                        disabled={isGenerating}
                                        aria-label={`Line ${index + 1} lyric`}
                                        onFocus={() => setActiveLineIndex(index)}
                                        onChange={(e) => handleLineTextChange(index, e.target.value)}
                                        onBlur={handleLineTextBlur}
                                        onPaste={(e) => handleLinePaste(index, e)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') e.currentTarget.blur()
                                        }}
                                        className="min-w-0 flex-1 bg-transparent py-0.5 text-xs text-white outline-none placeholder:text-white/30"
                                    />

                                    <div className="flex shrink-0 items-center gap-1">
                                        {[-NUDGE_STEP, NUDGE_STEP].map((delta) => (
                                            <button
                                                key={delta}
                                                type="button"
                                                disabled={isGenerating}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleNudgeLine(index, delta)
                                                }}
                                                title={`${delta < 0 ? 'Rewind' : 'Forward'} ${NUDGE_STEP}s`}
                                                className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/75 transition-colors hover:bg-white/20 hover:text-white cursor-pointer disabled:opacity-40"
                                            >
                                                {delta < 0 ? '-' : '+'}{NUDGE_STEP}s
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            disabled={isGenerating}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleDeleteLine(index)
                                            }}
                                            title="Delete line"
                                            aria-label={`Delete line ${index + 1}`}
                                            className="rounded-lg p-1 text-white/40 transition-colors hover:bg-red-500/15 hover:text-red-400 cursor-pointer disabled:opacity-40"
                                        >
                                            <Trash2Icon width={13} height={13} />
                                        </button>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                ) : (
                    <p className="py-3 text-center text-xs text-white/40">
                        No lyrics yet. Generate with AI or click Add Line.
                    </p>
                )}
            </div>

            <div className="flex items-center gap-2">
                <IconButton
                    variant="secondary"
                    size="md"
                    aria-label={playing ? 'Pause' : 'Play'}
                    onClick={onTogglePlay}
                    disabled={isGenerating}
                >
                    {playing ? <PauseIcon width={16} height={16} /> : <PlayIcon width={16} height={16} className="ml-0.5" />}
                </IconButton>
                <Button
                    variant="primary"
                    size="md"
                    className="flex-1"
                    onClick={handleMarkCurrentLine}
                    disabled={isGenerating || lines.length === 0}
                >
                    {lines.length === 0
                        ? 'Mark Line'
                        : isDone
                            ? 'Re-mark This Line'
                            : `Mark Line #${safeActiveIndex + 1}`}
                </Button>
                <IconButton
                    variant="secondary"
                    size="md"
                    onClick={handleResetAll}
                    disabled={isGenerating || !hasAnyTime}
                    aria-label="Reset Timing"
                    title="Reset All Timing"
                >
                    <RefreshCcw width={15} height={15} />
                </IconButton>
            </div>
        </div>
    )
}
