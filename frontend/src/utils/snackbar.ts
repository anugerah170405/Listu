export type SnackbarData = {
    message: string
    type?: 'loading' | 'success' | 'error'
    duration?: number
}

export function showSnackbar(
    message: string,
    type: 'loading' | 'success' | 'error' = 'success',
    duration?: number
) {
    window.dispatchEvent(new CustomEvent('listu-snackbar', { detail: { message, type, duration } }))
}
