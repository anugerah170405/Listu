import type { Card } from '../types'

const API_BASE = '/api/v1'

export interface TrackAudioAssets {
  original_url?: string
  vocals_url?: string
  instrumental_url?: string
  transformed_url?: string
  mastered_url?: string
}

export interface TrackLyrics {
  lines: string[]
  line_times: number[]
  raw_lrc?: string
  language?: string
}

export interface EngineTask {
  status: 'idle' | 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  error?: string
  updated_at?: string
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
  tasks: Record<string, EngineTask>
  created_at: string
  updated_at: string
}

export interface UpdateTrackPayload {
  title?: string
  artist?: string
  duration?: string
  cover_url?: string
  genre?: string
  lyrics_lines?: string[]
  lyrics_times?: number[]
  lyrics_language?: string
}

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const isForm = options?.body instanceof FormData
  const headers = isForm ? { ...options?.headers } : { 'Content-Type': 'application/json', ...options?.headers }

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

export const separateTrackAudio = (trackId: string) =>
  apiFetch<Track>(`/separator/${trackId}`, { method: 'POST' })

export const generateTrackLyrics = (trackId: string, language?: string) =>
  apiFetch<Track>(`/lyrics/${trackId}${languageQuery(language)}`, { method: 'POST' })

export const alignTrackLyrics = (trackId: string, language?: string) =>
  apiFetch<Track>(`/lyrics/${trackId}/align${languageQuery(language)}`, { method: 'POST' })

export function trackToCard(track: Track): Card {
  const separator = track.tasks?.separator
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
    isSeparating: separator?.status === 'processing',
    separationError: separator?.error,
  }
}
