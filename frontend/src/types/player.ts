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

