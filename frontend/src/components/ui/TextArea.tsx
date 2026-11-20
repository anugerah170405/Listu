import { forwardRef, type TextareaHTMLAttributes } from 'react'

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string
    error?: string
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
    {
        label,
        error,
        id,
        className = '',
        disabled,
        rows = 4,
        ...props
    },
    ref
) {
    const textareaId = id || (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined)

    return (
        <div className="w-full">
            {label && (
                <label
                    htmlFor={textareaId}
                    className="mb-1.5 block pl-0.5 text-[11px] font-medium tracking-wider text-white/50 uppercase select-none"
                >
                    {label}
                </label>
            )}
            <textarea
                ref={ref}
                id={textareaId}
                rows={rows}
                disabled={disabled}
                className={`w-full rounded-2xl bg-white/[0.06] p-3.5 text-sm text-white leading-relaxed placeholder:text-white/30 outline-none transition-all duration-200 hover:bg-white/[0.08] focus:bg-white/[0.12] disabled:opacity-40 resize-none ${
                    error ? 'bg-red-500/10 text-red-200 placeholder:text-red-300/40' : ''
                } ${className}`.trim()}
                {...props}
            />
        </div>
    )
})

export default TextArea
