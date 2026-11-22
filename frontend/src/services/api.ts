import type { Card, TaskStatus } from '../types'

const API_BASE = '/api/v1'

export interface TrackAudioAssets {
  original_url?: string
  vocals_url?: string
  instrumental_url?: string
}

export interface TrackLyrics {
  lines: string[]
  line_times: (number | null)[]
  language?: string
}

export interface Track {
  id: string
  title: string
  artist: string
  duration: string
  cover_url?: string
  genre?: string
  audio: TrackAudioAssets
  lyrics: TrackLyrics
  processing?: Record<string, TaskStatus>
  created_at: string
  updated_at: string
}

export interface UpdateTrackPayload {
  title?: string
  artist?: string
  duration?: string
  cover_url?: string | null
  genre?: string | null
  lyrics_lines?: string[]
  lyrics_times?: (number | null | undefined)[]
  lyrics_language?: string | null
}

let authTokenGetter: (() => Promise<string | null>) | null = null

export function setAuthTokenGetter(getter: () => Promise<string | null>) {
  authTokenGetter = getter
}

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const isForm = options?.body instanceof FormData
  const token = authTokenGetter ? await authTokenGetter() : null
  const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

  const headers = isForm
    ? { ...authHeader, ...options?.headers }
    : { 'Content-Type': 'application/json', ...authHeader, ...options?.headers }

  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(errorBody.detail || `Request failed (${response.status})`)
  }

  return response.json()
}

const languageQuery = (language?: string) => (language ? `?language=${encodeURIComponent(language)}` : '')

export const fetchTracks = () => apiFetch<Track[]>('/tracks')

export function createTrack(card: Card) {
  const form = new FormData()
  const fields: Record<string, string | undefined> = {
    id: card.id,
    title: card.title,
    artist: card.artist,
    duration: card.duration,
    cover_url: card.src,
    genre: card.genre,
  }
  for (const [key, value] of Object.entries(fields)) {
    if (value) form.append(key, value)
  }
  if (card.audioFile) form.append('file', card.audioFile)

  return apiFetch<Track>('/tracks', { method: 'POST', body: form })
}

export const updateTrackMetadata = (trackId: string, payload: UpdateTrackPayload) =>
  apiFetch<Track>(`/tracks/${trackId}`, { method: 'PATCH', body: JSON.stringify(payload) })

export function uploadTrackCover(trackId: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  return apiFetch<Track>(`/tracks/${trackId}/cover`, { method: 'POST', body: form })
}

export const deleteTrack = (trackId: string) =>
  apiFetch<{ message: string }>(`/tracks/${trackId}`, { method: 'DELETE' })

export const deleteTrackLyrics = (trackId: string) =>
  apiFetch<Track>(`/tracks/${trackId}/lyrics`, { method: 'DELETE' })

export const deleteProcessedAudio = (trackId: string) =>
  apiFetch<Track>(`/tracks/${trackId}/processed-audio`, { method: 'DELETE' })

export const separateTrackAudio = (trackId: string) =>
  apiFetch<Track>(`/separator/${trackId}`, { method: 'POST' })

export const generateTrackLyrics = (trackId: string, language?: string) =>
  apiFetch<Track>(`/lyrics/${trackId}${languageQuery(language)}`, { method: 'POST' })

export const transformTrackGenre = (
  trackId: string,
  genre: string,
  durationLimit?: number | null,
  includeVocals: boolean = true,
) =>
  apiFetch<Track>(`/transformer/${trackId}`, {
    method: 'POST',
    body: JSON.stringify({
      genre,
      duration_limit: durationLimit ?? null,
      include_vocals: includeVocals,
    }),
  })

export function trackToCard(track: Track): Card {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    duration: track.duration,
    src: track.cover_url,
    genre: track.genre,
    audio: track.audio?.original_url,
    vocalsAudio: track.audio?.vocals_url,
    instrumentalAudio: track.audio?.instrumental_url,
    lyrics: track.lyrics?.lines?.length ? track.lyrics.lines : undefined,
    lyricTimes: track.lyrics?.line_times?.length ? track.lyrics.line_times : undefined,
    language: track.lyrics?.language,
    processing: track.processing,
    createdAt: track.created_at,
    updatedAt: track.updated_at,
  }
}
