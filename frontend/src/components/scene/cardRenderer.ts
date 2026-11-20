import type { Card } from '../../types'

export function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
    const iw = img.naturalWidth, ih = img.naturalHeight, r = w / h
    const [sw, sh] = iw / ih > r ? [ih * r, ih] : [iw, iw / r]
    const [sx, sy] = iw / ih > r ? [(iw - sw) / 2, 0] : [0, (ih - sh) * 0.3]
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h)
}

export function drawCard(
    ctx: CanvasRenderingContext2D,
    card: Card,
    w: number,
    h: number,
    img?: HTMLImageElement,
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
    if (img?.complete && img.naturalWidth) {
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
        ctx.fillText(card.title, 22 * k, h - 48 * k)

        ctx.fillStyle = 'rgba(255,255,255,0.72)'
        ctx.font = `500 ${10 * k}px "Inter Tight", "Inter", sans-serif`
        ctx.letterSpacing = `${0.8 * k}px`
        ctx.fillText(card.artist.toUpperCase(), 22 * k, h - 25 * k)

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

