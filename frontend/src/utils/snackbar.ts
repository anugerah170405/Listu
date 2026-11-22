export type SnackbarData = {
    message: string
    type?: 'loading' | 'success' | 'error'
    duration?: number
}

export function showSnackbar(
    message: unknown,
    type: 'loading' | 'success' | 'error' = 'success',
    duration?: number
) {
    const text = message instanceof Error ? message.message : String(message || 'Something went wrong')
    window.dispatchEvent(new CustomEvent<SnackbarData | null>('listu-snackbar', { detail: { message: text, type, duration } }))
}

export function hideSnackbar() {
    window.dispatchEvent(new CustomEvent<SnackbarData | null>('listu-snackbar', { detail: null }))
}
