export type TaskStatus = {
  status: 'ready' | 'processing' | 'failed'
  source_id?: string | null
  detail?: string | null
  error?: string | null
  updated_at?: string | null
}

export type Card = {
  id: string
  title: string
  artist: string
  duration: string
  src?: string
  audio?: string
  audioFile?: File
  vocalsAudio?: string
  instrumentalAudio?: string
  lyrics?: string[]
  lyricTimes?: (number | null | undefined)[]
  language?: string
  genre?: string
  createdAt?: string
  updatedAt?: string
  processing?: {
    separator?: TaskStatus
    lyrics?: TaskStatus
    transformer?: TaskStatus
    [key: string]: TaskStatus | undefined
  }
}

export type LyricsView = {
  lines: string[]
  active: number
  card: Card
}

export type Stem = 'full' | 'instrumental' | 'vocal'

export type PlayerState = {
  playing: boolean
  time: number
  duration: number
  onToggle: () => void
  onPrev: () => void
  onNext: () => void
  onSeek: (t: number) => void
}
