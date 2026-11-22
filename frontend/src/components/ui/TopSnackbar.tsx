import { useEffect, useState } from 'react'
import { Loader2Icon, CheckCircle2Icon, AlertCircleIcon } from 'lucide-react'
import type { SnackbarData } from '../../utils/snackbar'

export default function TopSnackbar() {
    const [snackbar, setSnackbar] = useState<SnackbarData | null>({ message: 'Loading data', type: 'loading' })

    useEffect(() => {
        const handler = (e: Event) => {
            const custom = e as CustomEvent<SnackbarData | null>
            setSnackbar(custom.detail ?? null)
        }
        window.addEventListener('listu-snackbar', handler)
        return () => window.removeEventListener('listu-snackbar', handler)
    }, [])

    useEffect(() => {
        if (!snackbar || snackbar.type === 'loading') return
        const delay = snackbar.duration ?? (snackbar.type === 'error' ? 3500 : 2200)
        const timer = setTimeout(() => setSnackbar(null), delay)
        return () => clearTimeout(timer)
    }, [snackbar])

    if (!snackbar) return null
    const type = snackbar.type ?? 'loading'

    return (
        <aside
            aria-live="polite"
            className="pointer-events-none fixed top-6 left-1/2 z-50 -translate-x-1/2 transition-all duration-300 ease-out"
        >
            <div className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-white/10 bg-neutral-900/95 px-4 py-2 text-xs font-medium text-white shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-md animate-in fade-in slide-in-from-top-3">
                {type === 'loading' && <Loader2Icon className="h-3.5 w-3.5 animate-spin text-[#ff4a1c]" />}
                {type === 'success' && <CheckCircle2Icon className="h-3.5 w-3.5 text-emerald-400" />}
                {type === 'error' && <AlertCircleIcon className="h-3.5 w-3.5 text-red-400" />}
                <span className="tracking-wide select-none">{snackbar.message}</span>
            </div>
        </aside>
    )
}
