import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

export type IconButtonVariant = 'ghost' | 'secondary' | 'primary'
export type IconButtonSize = 'sm' | 'md'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: IconButtonVariant
    size?: IconButtonSize
    children: ReactNode
    'aria-label': string
}

const variantStyles: Record<IconButtonVariant, string> = {
    ghost: 'text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-40',
    secondary: 'bg-white/[0.08] text-white hover:bg-white/[0.13] disabled:opacity-40',
    primary:
        'bg-white text-neutral-900 hover:bg-white/90 shadow-sm disabled:bg-white/10 disabled:text-white/40',
}

const sizeStyles: Record<IconButtonSize, string> = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
    {
        variant = 'ghost',
        size = 'md',
        className = '',
        children,
        type = 'button',
        ...props
    },
    ref
) {
    return (
        <button
            ref={ref}
            type={type}
            className={`grid place-items-center shrink-0 rounded-full cursor-pointer transition-all duration-200 active:scale-90 disabled:active:scale-100 ${sizeStyles[size]} ${variantStyles[variant]} ${className}`.trim()}
            {...props}
        >
            {children}
        </button>
    )
})

export default IconButton
