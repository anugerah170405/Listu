import type { ReactNode } from 'react'

type NavButtonProps = {
    label: string
    active?: boolean
    hideTip?: boolean
    onClick: () => void
    children: ReactNode
}

export default function NavButton({
    label,
    active,
    hideTip,
    onClick,
    children,
}: NavButtonProps) {
    return (
        <div className="group relative">
            <span
                className={`pointer-events-none absolute bottom-full left-1/2 mb-4 -translate-x-1/2 translate-y-1 rounded-full bg-white px-4 py-2 text-[13px] font-medium whitespace-nowrap text-neutral-900 opacity-0 shadow-[0_6px_24px_rgba(0,0,0,0.14)] ring-1 ring-black/5 transition-all duration-200 ${hideTip ? '' : 'group-hover:translate-y-0 group-hover:opacity-100'}`}
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
