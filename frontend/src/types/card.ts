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
    isSeparating?: boolean
    separationError?: string
    lyrics?: string[]
    lyricTimes?: number[]
    genre?: string
}

export type LyricsView = {
    lines: string[]
    active: number
    card: Card
}
