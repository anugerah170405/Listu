export interface SegmentedOption<T extends string> {
    id: T
    label: string
}

export interface SegmentedControlProps<T extends string> {
    options: readonly SegmentedOption<T>[] | SegmentedOption<T>[]
    value: T
    onChange: (value: T) => void
    className?: string
    disabled?: boolean
}

export function SegmentedControl<T extends string>({
    options,
    value,
    onChange,
    className = '',
    disabled = false,
}: SegmentedControlProps<T>) {
    return (
        <div className={`flex rounded-full bg-white/[0.06] p-1 gap-1 select-none ${className}`.trim()}>
            {options.map((opt) => {
                const isActive = value === opt.id
                return (
                    <button
                        key={opt.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(opt.id)}
                        className={`flex-1 rounded-full py-2 text-xs font-medium transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                            isActive
                                ? 'bg-white text-neutral-900 shadow-[0_2px_8px_rgba(0,0,0,0.25)]'
                                : 'text-white/60 hover:text-white hover:bg-white/[0.04] active:scale-95'
                        }`}
                    >
                        {opt.label}
                    </button>
                )
            })}
        </div>
    )
}

export default SegmentedControl
