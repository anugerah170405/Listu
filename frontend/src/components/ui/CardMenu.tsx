import { useEffect } from 'react'
import { SlidersIcon, TrashIcon } from 'lucide-react'

export default function CardMenu({
    x,
    y,
    onStudio,
    onDelete,
    onClose,
}: {
    x: number
    y: number
    onStudio: () => void
    onDelete: () => void
    onClose: () => void
}) {
    useEffect(() => {
        const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
        window.addEventListener('keydown', key)
        window.addEventListener('wheel', onClose, { passive: true })
        window.addEventListener('resize', onClose)
        return () => {
            window.removeEventListener('keydown', key)
            window.removeEventListener('wheel', onClose)
            window.removeEventListener('resize', onClose)
        }
    }, [onClose])

    const W = 176
    const H = 100
    const left = Math.max(8, Math.min(x, window.innerWidth - W - 8))
    const top = Math.max(8, Math.min(y, window.innerHeight - H - 8))

    const item = 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-white/10 cursor-pointer'

    return (
        <>
            <div className="fixed inset-0 z-40" onPointerDown={onClose} onContextMenu={(e) => { e.preventDefault(); onClose() }} />
            <div
                role="menu"
                style={{ left, top, width: W }}
                className="fixed z-50 origin-top-left animate-[menu-in_0.16s_ease-out] rounded-2xl bg-[#0d0d0d] p-1.5 text-white shadow-[0_18px_50px_-12px_rgba(0,0,0,0.55)]"
            >
                <button role="menuitem" className={`${item} text-white/90`} onClick={onStudio}>
                    <SlidersIcon width={16} height={16} />
                    Studio
                </button>
                <div className="mx-2 h-px bg-white/10" />
                <button role="menuitem" className={`${item} text-[#ff7a57]`} onClick={onDelete}>
                    <TrashIcon width={16} height={16} />
                    Delete
                </button>
            </div>
        </>
    )
}
