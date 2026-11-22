import type { Card } from '../../types'

export type CoverSource = HTMLImageElement | HTMLCanvasElement

export function drawCover(ctx: CanvasRenderingContext2D, img: CoverSource, w: number, h: number) {
    const iw = img instanceof HTMLImageElement ? img.naturalWidth : img.width
    const ih = img instanceof HTMLImageElement ? img.naturalHeight : img.height
    if (!iw || !ih) return

    const r = w / h
    const ir = iw / ih
    const [sw, sh] = ir > r ? [ih * r, ih] : [iw, iw / r]
    const [sx, sy] = ir > r ? [(iw - sw) / 2, 0] : [0, (ih - sh) / 2]
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h)
}

export function drawCard(
    ctx: CanvasRenderingContext2D,
    card: Card,
    w: number,
    h: number,
    img?: CoverSource,
    hovered = false,
    showInfo = true,
) {
    const k = w / 320
    ctx.save()

    ctx.beginPath()
    ctx.roundRect(0, 0, w, h, w * 0.085)
    ctx.clip()

    ctx.fillStyle = '#202022'
    ctx.fillRect(0, 0, w, h)
    const ready = img instanceof HTMLImageElement ? img.complete && img.naturalWidth > 0 : Boolean(img && img.width > 0)
    if (img && ready) {
        drawCover(ctx, img, w, h)
    } else {
        ctx.save()
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
        const r = Math.min(w, h) * 0.28
        ctx.beginPath()
        ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
        ctx.beginPath()
        ctx.arc(w / 2, h / 2, r * 0.28, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
    }

    if (showInfo) {
        const infoGrad = ctx.createLinearGradient(0, h * 0.55, 0, h)
        infoGrad.addColorStop(0, 'rgba(0,0,0,0)')
        infoGrad.addColorStop(0.7, 'rgba(0,0,0,0.42)')
        infoGrad.addColorStop(1, 'rgba(0,0,0,0.85)')
        ctx.fillStyle = infoGrad
        ctx.fillRect(0, h * 0.5, w, h * 0.5)

        ctx.textBaseline = 'alphabetic'
        ctx.textAlign = 'left'
        ctx.fillStyle = '#fff'
        ctx.font = `600 ${17 * k}px "Inter Tight", "Inter", sans-serif`
        ctx.fillText(card.title.length > 32 ? card.title.slice(0, 30) + '...' : card.title, 22 * k, h - 48 * k)

        ctx.fillStyle = 'rgba(255,255,255,0.72)'
        ctx.font = `500 ${10 * k}px "Inter Tight", "Inter", sans-serif`
        ctx.letterSpacing = `${0.8 * k}px`
        const artist = card.artist.toUpperCase()
        ctx.fillText(artist.length > 20 ? artist.slice(0, 20) + '...' : artist, 22 * k, h - 25 * k)

        ctx.textAlign = 'right'
        ctx.fillText(card.duration, w - 22 * k, h - 25 * k)
        ctx.letterSpacing = '0px'
    }

    if (hovered) {
        ctx.fillStyle = 'rgba(0,0,0,0.2)'
        ctx.fillRect(0, 0, w, h)

        ctx.fillStyle = 'rgba(255,255,255,0.95)'
        ctx.beginPath()
        ctx.arc(w / 2, h / 2, 31 * k, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#111'
        ctx.beginPath()
        ctx.moveTo(w / 2 - 5 * k, h / 2 - 11 * k)
        ctx.lineTo(w / 2 + 12 * k, h / 2)
        ctx.lineTo(w / 2 - 5 * k, h / 2 + 11 * k)
        ctx.closePath()
        ctx.fill()

        ctx.fillStyle = 'rgba(0,0,0,0.38)'
        ctx.beginPath()
        ctx.arc(w - 28 * k, 28 * k, 15 * k, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#fff'
        for (const dx of [-6, 0, 6]) {
            ctx.beginPath()
            ctx.arc(w - 28 * k + dx * k, 28 * k, 1.8 * k, 0, Math.PI * 2)
            ctx.fill()
        }
    }

    ctx.restore()
}
