import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { formatTime } from '../../utils/format'

type ProgressLineProps = {
    time: number
    duration: number
    onSeek: (t: number) => void
}

export default function ProgressLine({ time, duration, onSeek }: ProgressLineProps) {
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
                className={`pointer-events-none absolute bottom-full mb-2 -translate-x-1/2 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-neutral-900 tabular-nums shadow-[0_6px_24px_rgba(0,0,0,0.14)] ring-1 ring-black/5 transition-opacity duration-150 ${hover ? 'opacity-100' : 'opacity-0'}`}
                style={{ left: `${ratio * 100}%` }}
            >
                {formatTime(time)} / {formatTime(duration)}
            </span>
        </div>
    )
}

