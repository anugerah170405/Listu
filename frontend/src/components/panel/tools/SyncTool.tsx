import { useState, useRef, useEffect } from 'react'
import type { Card } from '../../../types'
import { PauseIcon, PlayIcon, RefreshCcw, SparklesIcon } from 'lucide-react'
import { formatTime } from '../../../utils/format'
import { showSnackbar } from '../../../utils/snackbar'
import { showError } from '../../../utils/error'
import { alignTrackLyrics } from '../../../services/api'
import Button from '../../ui/Button'
import IconButton from '../../ui/IconButton'
import LanguageSelect from '../../ui/LanguageSelect'

type SyncToolProps = {
    card: Card
    time: number
    playing: boolean
    onUpdate: (patch: Partial<Card>) => void
    onSeek: (timestamp: number) => void
    onTogglePlay: () => void
}

type Timestamps = (number | undefined)[]

const NUDGE_STEP = 0.2
const round1 = (n: number) => Math.round(n * 10) / 10

export default function SyncTool({ card, time, playing, onUpdate, onSeek, onTogglePlay }: SyncToolProps) {
    const lines = card.lyrics ?? []
    const [timestamps, setTimestamps] = useState<Timestamps>(card.lyricTimes ?? [])
    const [selectedLang, setSelectedLang] = useState(card.language ?? '')
    const [activeLineIndex, setActiveLineIndex] = useState(0)
    const [isAligning, setIsAligning] = useState(false)
    const activeItemRef = useRef<HTMLLIElement | null>(null)

    useEffect(() => {
        if (card.lyricTimes) setTimestamps(card.lyricTimes)
    }, [card.lyricTimes])

    useEffect(() => {
        if (card.language) setSelectedLang(card.language)
    }, [card.language])

    useEffect(() => {
        activeItemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, [activeLineIndex])

    if (!lines.length) {
        return <p className="text-xs text-white/50 text-center py-4">Write lyrics first in the Write Lyrics tab.</p>
    }

    const withTime = (index: number, value: number): Timestamps => {
        const next = Array.from({ length: lines.length }, (_, i) => timestamps[i])
        next[index] = value
        return next
    }

    const commit = (next: Timestamps) => {
        setTimestamps(next)
        onUpdate({ lyricTimes: next as number[] })
    }

    const handleAutoAlign = async () => {
        if (!card.id || (!card.audio && !card.vocalsAudio)) {
            showSnackbar('Audio file not found', 'error')
            return
        }

        setIsAligning(true)
        try {
            const lang = selectedLang || card.language || undefined
            const { lyrics } = await alignTrackLyrics(card.id, lang)
            const times = lyrics?.line_times ?? []
            const detected = lyrics?.language ?? lang
            setTimestamps(times)
            if (detected) setSelectedLang(detected)
            onUpdate({ lyricTimes: times, language: detected })
            showSnackbar('Lyrics auto-synchronized by AI!', 'success')
        } catch (err) {
            showError(err, 'Failed to align lyrics timing')
        } finally {
            setIsAligning(false)
        }
    }

    const handleMarkCurrentLine = () => {
        if (activeLineIndex >= lines.length) return
        const next = withTime(activeLineIndex, round1(time))
        commit(next)

        if (next.every((t) => t !== undefined)) showSnackbar('All lyric lines synchronized successfully!', 'success')
        if (activeLineIndex + 1 < lines.length) setActiveLineIndex(activeLineIndex + 1)
    }

    const nudgeTimestamp = (delta: number) => {
        const adjusted = Math.max(0, round1((timestamps[activeLineIndex] ?? time) + delta))
        commit(withTime(activeLineIndex, adjusted))
        onSeek(adjusted)
    }

    const handleSelectLine = (index: number) => {
        setActiveLineIndex(index)
        const t = timestamps[index]
        if (t !== undefined) onSeek(t)
    }

    const handleSaveManual = () => {
        onUpdate({ lyricTimes: timestamps as number[] })
        showSnackbar('Timing synchronization saved successfully!', 'success')
    }

    const handleResetAll = () => {
        setTimestamps([])
        setActiveLineIndex(0)
        onUpdate({ lyricTimes: undefined })
        onSeek(0)
        showSnackbar('Lyric timing reset', 'success')
    }

    const activeTime = timestamps[activeLineIndex]
    const hasAnyTime = timestamps.some((t) => t !== undefined)
    const isAllMarked = timestamps.length === lines.length && timestamps.every((t) => t !== undefined)
    const isDone = activeLineIndex >= lines.length - 1 && activeTime !== undefined

    return (
        <div className="space-y-3">
            <div className="flex gap-2 items-center">
                <LanguageSelect
                    value={selectedLang}
                    onChange={(lang) => {
                        setSelectedLang(lang)
                        onUpdate({ language: lang || undefined })
                    }}
                    disabled={isAligning}
                    title="Select language for alignment"
                    className="w-32"
                />
                <Button
                    variant="secondary"
                    size="md"
                    className="flex-1"
                    leftIcon={<SparklesIcon size={14} className="text-yellow-400" />}
                    loading={isAligning}
                    onClick={handleAutoAlign}
                >
                    {isAligning ? 'Aligning...' : 'Auto-Sync AI'}
                </Button>
            </div>

            <div className="flex gap-2 items-center">
                <IconButton variant="secondary" size="md" aria-label={playing ? 'Pause' : 'Play'} onClick={onTogglePlay}>
                    {playing ? <PauseIcon width={16} height={16} /> : <PlayIcon width={16} height={16} className="ml-0.5" />}
                </IconButton>
                <Button variant="primary" size="md" className="flex-1" onClick={handleMarkCurrentLine} disabled={isAligning}>
                    {isDone ? 'Re-mark This Line' : `Mark Line #${activeLineIndex + 1}`}
                </Button>
                <IconButton variant="secondary" size="md" onClick={handleResetAll} aria-label="Reset Timing" title="Reset All Timing">
                    <RefreshCcw width={15} height={15} />
                </IconButton>
            </div>

            {activeTime !== undefined && (
                <div className="flex items-center justify-between bg-white/[0.04] border border-white/5 rounded-xl px-3 py-1.5 text-xs">
                    <span className="text-white/50 text-[11px]">
                        Line #{activeLineIndex + 1}: <span className="text-white font-medium">{formatTime(activeTime, true)}</span>
                    </span>
                    <div className="flex items-center gap-1">
                        {[-NUDGE_STEP, NUDGE_STEP].map((delta) => (
                            <button
                                key={delta}
                                type="button"
                                onClick={() => nudgeTimestamp(delta)}
                                className="px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded text-[11px] font-mono cursor-pointer transition-colors"
                                title={`${delta < 0 ? 'Rewind' : 'Forward'} ${NUDGE_STEP}s`}
                            >
                                {delta < 0 ? '-' : '+'}{NUDGE_STEP}s
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <ul className="max-h-52 space-y-0.5 overflow-y-auto pr-1">
                {lines.map((line, index) => {
                    const isSelected = index === activeLineIndex
                    const t = timestamps[index]
                    const tone = isSelected
                        ? 'bg-white/15 text-white font-medium ring-1 ring-white/20'
                        : t !== undefined
                          ? 'text-white/80'
                          : 'text-white/40'
                    return (
                        <li key={index} ref={isSelected ? activeItemRef : null}>
                            <button
                                type="button"
                                onClick={() => handleSelectLine(index)}
                                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs transition-colors hover:bg-white/10 cursor-pointer ${tone}`}
                            >
                                <span className={`w-14 shrink-0 font-mono text-[11px] tabular-nums ${t !== undefined ? 'text-yellow-400/90' : 'text-white/30'}`}>
                                    {t !== undefined ? formatTime(t, true) : '--:--.-'}
                                </span>
                                <span className="truncate flex-1">{line}</span>
                            </button>
                        </li>
                    )
                })}
            </ul>

            {!isAllMarked && hasAnyTime && (
                <Button variant="secondary" size="sm" fullWidth onClick={handleSaveManual}>
                    Save Changes
                </Button>
            )}
        </div>
    )
}
