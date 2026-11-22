export type LyricBlock = {
    y: number
    h: number
    rows: string[]
}

export type LyricsLayoutState = {
    cur: number
    target: number
    activeLine: number
    cardId: string | null
    lines: string[] | null
    layoutW: number
    blocks: LyricBlock[]
    act: number[]
    fade: number
    mode: boolean
    fs: number
    lh: number
}

export function createLyricsState(): LyricsLayoutState {
    return {
        cur: 0,
        target: 0,
        activeLine: -1,
        cardId: null,
        lines: null,
        layoutW: 0,
        blocks: [],
        act: [],
        fade: 1,
        mode: false,
        fs: 40,
        lh: 46,
    }
}

export function layoutLyrics(
    ctx: CanvasRenderingContext2D,
    ly: LyricsLayoutState,
    lines: string[],
    viewportWidth: number
) {
    ly.fs = Math.max(26, Math.min(46, viewportWidth * 0.05))
    ly.lh = ly.fs * 1.18
    const gap = ly.fs * 0.6
    const maxW = Math.min(viewportWidth * 0.84, 760)

    ctx.font = `600 ${ly.fs}px "Inter Tight", "Inter", sans-serif`
    let y = Math.max(130, ly.fs * 3)

    ly.blocks = lines.map((line) => {
        const rows: string[] = []
        let cur = ''
        for (const word of line.split(' ')) {
            const test = cur ? `${cur} ${word}` : word
            if (cur && ctx.measureText(test).width > maxW) {
                rows.push(cur)
                cur = word
            } else {
                cur = test
            }
        }
        rows.push(cur)
        const h = rows.length * ly.lh + gap
        const block: LyricBlock = { y, h, rows }
        y += h
        return block
    })

    const prevAct = ly.act || []
    ly.lines = lines
    ly.layoutW = viewportWidth
    ly.act = lines.map((_, i) => prevAct[i] ?? (i === ly.activeLine ? 1 : 0))
}

export function findLyricIndexAt(
    blocks: LyricBlock[],
    y: number,
    viewportHeight: number,
    scrollY: number
): number {
    for (let i = 0; i < blocks.length; i++) {
        const top = viewportHeight / 2 + blocks[i].y - scrollY
        if (y >= top && y <= top + blocks[i].h) return i
    }
    return -1
}
