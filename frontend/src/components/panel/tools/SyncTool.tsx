import { useState } from 'react'
import type { Card } from '../../../types'
import { PauseIcon, PlayIcon } from 'lucide-react'
import { formatTime } from '../../../utils/format'

type SyncToolProps = {
    card: Card
    time: number
    playing: boolean
    onUpdate: (patch: Partial<Card>) => void
    onSeek: (t: number) => void
    onTogglePlay: () => void
}

const btn = 'rounded-full px-4 py-2 text-[12px] font-medium transition-colors cursor-pointer'

export default function SyncTool({ card, time, playing, onUpdate, onSeek, onTogglePlay }: SyncToolProps) {
    const lines = card.lyrics ?? []
    const [draft, setDraft] = useState<(number | undefined)[]>(card.lyricTimes ?? [])
    const [cursor, setCursor] = useState(0)

    if (!lines.length) {
        return (
            <p className="text-[12px] leading-relaxed text-white/50">
                Buat lirik terlebih dahulu, lalu sinkronkan waktunya di sini.
            </p>
        )
    }

    const mark = () => {
        if (cursor >= lines.length) return
        const next = Array.from({ length: lines.length }, (_, i) => draft[i])
        next[cursor] = Math.round(time * 10) / 10
        setDraft(next)
        setCursor(cursor + 1)
        if (next.every((v) => v !== undefined)) onUpdate({ lyricTimes: next as number[] })
    }

    const reset = () => {
        setDraft([])
        setCursor(0)
        onUpdate({ lyricTimes: undefined })
        onSeek(0)
    }

    const done = cursor >= lines.length

    return (
        <div>
            <p className="mb-3 text-[11px] leading-relaxed text-white/40">
                Putar lagu, lalu tekan Tandai tepat saat baris yang disorot mulai dinyanyikan.
            </p>
            <div className="flex gap-2">
                <button
                    onClick={onTogglePlay}
                    aria-label={playing ? 'Pause' : 'Play'}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20 cursor-pointer"
                >
                    {playing ? <PauseIcon width={16} height={16} /> : <PlayIcon width={16} height={16} className="ml-0.5" />}
                </button>
                <button
                    onClick={mark}
                    disabled={done}
                    className="h-10 flex-1 rounded-full bg-white text-[13px] font-semibold text-neutral-900 transition-colors hover:bg-[#ff4a1c] hover:text-white disabled:bg-white/10 disabled:text-white/40 cursor-pointer disabled:cursor-not-allowed"
                >
                    {done ? 'Selesai' : 'Tandai baris'}
                </button>
                <button onClick={reset} className={`${btn} bg-white/10 hover:bg-white/20`}>
                    Ulang
                </button>
            </div>
            <ul className="mt-3 max-h-44 space-y-0.5 overflow-y-auto">
                {lines.map((line: string, i: number) => (
                    <li key={i}>
                        <button
                            onClick={() => setCursor(i)}
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[12px] transition-colors hover:bg-white/10 cursor-pointer ${i === cursor ? 'bg-white/10 text-white' : 'text-white/55'}`}
                        >
                            <span className="w-12 shrink-0 text-[11px] text-white/40 tabular-nums">
                                {draft[i] !== undefined ? formatTime(draft[i]!, true) : '--:--.-'}
                            </span>
                            <span className="truncate">{line}</span>
                        </button>
                    </li>
                ))}
            </ul>
            {card.lyricTimes && <p className="mt-2 text-[11px] text-white/40">Lirik tersinkron.</p>}
        </div>
    )
}
