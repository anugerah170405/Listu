import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2Icon } from 'lucide-react'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger-ghost' | 'chip'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant
    size?: ButtonSize
    fullWidth?: boolean
    selected?: boolean
    loading?: boolean
    leftIcon?: ReactNode
    rightIcon?: ReactNode
}

const DISABLED = 'disabled:cursor-not-allowed disabled:active:scale-100'
const DISABLED_FADE = `disabled:opacity-40 ${DISABLED}`

const variantStyles: Record<ButtonVariant, string> = {
    primary: `bg-white text-neutral-900 font-medium hover:bg-white/90 active:scale-[0.98] shadow-sm disabled:bg-white/10 disabled:text-white/40 ${DISABLED}`,
    secondary: `bg-white/[0.08] text-white font-medium hover:bg-white/[0.13] active:scale-[0.98] ${DISABLED_FADE}`,
    outline: `bg-white/[0.05] text-white/90 font-medium hover:bg-white/[0.09] active:scale-[0.98] ${DISABLED_FADE}`,
    ghost: `text-white/70 hover:text-white hover:bg-white/[0.08] active:scale-[0.98] ${DISABLED_FADE}`,
    'danger-ghost': `text-white/40 hover:text-red-400 hover:bg-red-500/10 active:scale-[0.98] ${DISABLED_FADE}`,
    chip: `font-medium transition-all active:scale-95 ${DISABLED_FADE}`,
}

const sizeStyles: Record<ButtonSize, string> = {
    sm: 'px-3.5 py-2 text-xs rounded-xl',
    md: 'px-4 py-2.5 text-xs font-medium rounded-full',
    lg: 'h-11 px-5 text-sm font-semibold rounded-full',
}

const chipStyles = {
    selected: 'bg-white text-neutral-900 shadow-sm',
    idle: 'bg-white/[0.06] text-white/70 hover:bg-white/[0.1] hover:text-white',
}

const BASE = 'inline-flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer select-none'

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    {
        variant = 'primary',
        size = 'md',
        fullWidth = false,
        selected = false,
        loading = false,
        leftIcon,
        rightIcon,
        disabled,
        className = '',
        children,
        type = 'button',
        ...props
    },
    ref
) {
    const chip = variant === 'chip' ? chipStyles[selected ? 'selected' : 'idle'] : ''
    const classes = [BASE, variantStyles[variant], sizeStyles[size], chip, fullWidth && 'w-full', className]

    return (
        <button
            ref={ref}
            type={type}
            disabled={disabled || loading}
            className={classes.filter(Boolean).join(' ')}
            {...props}
        >
            {loading ? <Loader2Icon className="animate-spin" size={size === 'lg' ? 18 : 14} /> : leftIcon}
            {children}
            {!loading && rightIcon}
        </button>
    )
})

export default Button
