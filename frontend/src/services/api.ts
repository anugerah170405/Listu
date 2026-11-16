/**
 * API Service Client untuk komunikasi dengan FastAPI Backend
 * Endpoint menggunakan prefix /api dan /output yang di-proxy oleh Vite ke backend (port 8000)
 */

const API_BASE = '/api/v1'

export interface HealthResponse {
  status: string
  message: string
  timestamp: string
}

export interface SeparatorTrack {
  id: string
  original_filename: string
  vocals_url?: string
  instrumental_url?: string
  status: string
  created_at: string
}

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(errorBody.detail || `Request gagal (${response.status})`)
  }

  return response.json()
}

/**
 * Health check backend
 */
export async function checkBackendHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('/health')
}

/**
 * 1. VOCAL SEPARATOR ENDPOINTS
 */

// Ambil riwayat pemisahan lagu
export async function getSeparatedTracks(): Promise<SeparatorTrack[]> {
  return apiFetch<SeparatorTrack[]>('/separator/tracks')
}

// Upload file lagu dan pisahkan vokal vs instrumen
export async function separateAudioFile(file: File): Promise<SeparatorTrack> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE}/separator/separate`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(errorBody.detail || `Gagal memisahkan audio (${response.status})`)
  }

  return response.json()
}
