import { showSnackbar } from './snackbar'

export function errorMessage(err: unknown, fallback: string): string {
    return err instanceof Error ? err.message : fallback
}

export function showError(err: unknown, fallback: string) {
    showSnackbar(errorMessage(err, fallback), 'error')
}
