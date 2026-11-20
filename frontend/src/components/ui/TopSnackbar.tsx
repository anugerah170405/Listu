import { useEffect, useState, useRef, useCallback } from 'react'
import { Loader2Icon, CheckCircle2Icon, AlertCircleIcon } from 'lucide-react'
import type { SnackbarData } from '../../utils/snackbar'

type TopSnackbarProps = {
    snackbar: SnackbarData | null
    onClose: () => void
}

export default function TopSnackbar({ snackbar: externalSnackbar, onClose }: TopSnackbarProps) {
    const [localSnackbar, setLocalSnackbar] = useState<SnackbarData | null>(null)
    const current = localSnackbar ?? externalSnackbar

    const onCloseRef = useRef(onClose)
    useEffect(() => {
        onCloseRef.current = onClose
    }, [onClose])

    const handleClose = useCallback(() => {
        setLocalSnackbar(null)
        onCloseRef.current?.()
    }, [])

    useEffect(() => {
        const handler = (e: Event) => {
            const custom = e as CustomEvent<SnackbarData>
            if (custom.detail) setLocalSnackbar(custom.detail)
        }
        window.addEventListener('listu-snackbar', handler)
        return () => window.removeEventListener('listu-snackbar', handler)
    }, [])

    useEffect(() => {
        if (!current || current.type === 'loading') return
        const delay = current.duration ?? (current.type === 'error' ? 3500 : 2200)
        const timer = setTimeout(handleClose, delay)
        return () => clearTimeout(timer)
    }, [current, handleClose])

    if (!current) return null
    const type = current.type ?? 'loading'

    return (
        <aside
            aria-live="polite"
            className="pointer-events-none fixed top-6 left-1/2 z-50 -translate-x-1/2 transition-all duration-300 ease-out"
        >
            <div className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-white/10 bg-neutral-900/95 px-4 py-2 text-xs font-medium text-white shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-md animate-in fade-in slide-in-from-top-3">
                {type === 'loading' && <Loader2Icon className="h-3.5 w-3.5 animate-spin text-[#ff4a1c]" />}
                {type === 'success' && <CheckCircle2Icon className="h-3.5 w-3.5 text-emerald-400" />}
                {type === 'error' && <AlertCircleIcon className="h-3.5 w-3.5 text-red-400" />}
                <span className="tracking-wide select-none">{current.message}</span>
            </div>
        </aside>
    )
}
