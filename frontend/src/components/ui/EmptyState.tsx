import type { ReactNode } from 'react'
import { MusicIcon, type LucideIcon } from 'lucide-react'

type EmptyStateProps = {
    icon?: LucideIcon
    title?: string
    description?: ReactNode
    className?: string
}

export default function EmptyState({
    icon: Icon = MusicIcon,
    title = 'Studio is Empty',
    description = (
        <>
            Drag & drop audio files here, or click the{' '}
            <span className="font-semibold text-neutral-700">+</span> button on the bottom bar to add your first track.
        </>
    ),
    className = '',
}: EmptyStateProps) {
    return (
        <div
            className={`pointer-events-none fixed inset-0 z-10 flex flex-col items-center justify-center text-center select-none animate-in fade-in duration-300 ${className}`}
        >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 ring-1 ring-black/5">
                <Icon className="h-6 w-6 text-neutral-400" />
            </div>
            <h2 className="text-sm font-semibold tracking-tight text-neutral-800">
                {title}
            </h2>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-neutral-400">
                {description}
            </p>
        </div>
    )
}
