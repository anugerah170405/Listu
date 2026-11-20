import { ChevronDownIcon } from 'lucide-react'
import { LANGUAGE_OPTIONS } from '../../constants/languages'

type LanguageSelectProps = {
    value: string
    onChange: (value: string) => void
    disabled?: boolean
    title?: string
    className?: string
}

export default function LanguageSelect({ value, onChange, disabled, title, className = '' }: LanguageSelectProps) {
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
