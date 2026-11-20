import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
    leftIcon?: ReactNode
    rightIcon?: ReactNode
    inputSize?: 'sm' | 'md'
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
    {
        label,
        error,
        leftIcon,
        rightIcon,
        inputSize = 'md',
        id,
        className = '',
        disabled,
        ...props
    },
    ref
) {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)
    const isSm = inputSize === 'sm'

    return (
        <div className="w-full">
            {label && (
                <label
                    htmlFor={inputId}
                    className={`block pl-0.5 font-medium tracking-wider text-white/50 uppercase select-none ${
                        isSm ? 'mb-1 text-[10px]' : 'mb-1.5 text-[11px]'
                    }`}
                >
                    {label}
                </label>
            )}
            <div className="relative flex items-center">
                {leftIcon && (
                    <div className={`pointer-events-none absolute flex items-center text-white/40 ${isSm ? 'left-2.5' : 'left-3.5'}`}>
                        {leftIcon}
                    </div>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    disabled={disabled}
                    className={`w-full bg-white/[0.06] text-white placeholder:text-white/30 outline-none transition-all duration-200 hover:bg-white/[0.08] focus:bg-white/[0.12] disabled:opacity-40 ${
                        isSm ? 'rounded-xl px-3 py-2 text-xs' : 'rounded-2xl px-4 py-3 text-sm'
                    } ${leftIcon ? (isSm ? 'pl-8' : 'pl-10') : ''} ${
                        rightIcon ? (isSm ? 'pr-8' : 'pr-10') : ''
                    } ${error ? 'bg-red-500/10 text-red-200 placeholder:text-red-300/40' : ''} ${className}`.trim()}
                    {...props}
                />
                {rightIcon && (
                    <div className={`pointer-events-none absolute flex items-center text-white/40 ${isSm ? 'right-2.5' : 'right-3.5'}`}>
                        {rightIcon}
                    </div>
                )}
            </div>
        </div>
    )
})

export default TextInput
