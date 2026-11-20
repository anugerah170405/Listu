import { useEffect, useRef } from 'react'
import type { Card, LyricsView } from '../../types'
import { drawCard } from './cardRenderer'
import { initWebGL } from './shaders'
import { createLyricsState, layoutLyrics, findLyricIndexAt } from './lyricsLayout'

export default function LiquidScene({
    cards,
    onPlay,
    onMenu,
    lyrics = null,
    onSeekLine,
    active = true,
}: {
    cards: Card[]
    onPlay: (card: Card) => void
    onMenu: (card: Card, x: number, y: number) => void
    lyrics?: LyricsView | null
    onSeekLine?: (index: number) => void
    active?: boolean
}) {
    const glCanvas = useRef<HTMLCanvasElement>(null)
    const scroll = useRef({ target: 0, current: 0, pitch: 1, max: 0 })
    const propsRef = useRef({ cards, onPlay, onMenu, lyrics, onSeekLine, active })

    useEffect(() => {
        propsRef.current = { cards, onPlay, onMenu, lyrics, onSeekLine, active }
    }, [cards, onPlay, onMenu, lyrics, onSeekLine, active])

    useEffect(() => {
        const canvas = glCanvas.current!
        const off = document.createElement('canvas')
        const ctx = off.getContext('2d')!
        const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false })
        const images = new Map<string, HTMLImageElement>()

        const getImage = (c: Card) => {
            if (!c.src) return undefined
            let img = images.get(c.src)
            if (!img) {
                img = new Image()
                img.crossOrigin = 'anonymous'
                img.src = c.src
                images.set(c.src, img)
            }
            return img
        }

        let W = 0, H = 0, dpr = 1, cardW = 300, cardH = 400
        const s = scroll.current
        const ly = createLyricsState()

        const clamp = (v: number) => Math.max(0, Math.min(s.max, v))
        const clampLyrics = (v: number) => {
            if (!ly.blocks.length) return 0
            const last = ly.blocks[ly.blocks.length - 1]
            const max = Math.max(0, last.y + last.h / 2 + 100)
            return Math.max(0, Math.min(max, v))
        }

        const resize = () => {
            dpr = Math.min(window.devicePixelRatio || 1, 1.75)
            W = window.innerWidth
            H = window.innerHeight
            canvas.width = off.width = Math.round(W * dpr)
            canvas.height = off.height = Math.round(H * dpr)
            canvas.style.width = `${W}px`
            canvas.style.height = `${H}px`
            cardW = Math.max(200, Math.min(320, W * 0.22, H * 0.36))
            cardH = cardW * 1.36
            s.pitch = cardH + cardW * 0.22
            s.max = (propsRef.current.cards.length - 1) * s.pitch
            if (gl) gl.viewport(0, 0, canvas.width, canvas.height)
        }

        const glState = gl ? initWebGL(gl) : null
        resize()
        window.addEventListener('resize', resize)

        let touchY: number | null = null, startY = 0, startX = 0, hovered = -1

        const cardAt = (x: number, y: number) => {
            if (Math.abs(x - W / 2) > cardW / 2) return -1
            const list = propsRef.current.cards
            for (let i = 0; i < list.length; i++) {
                if (Math.abs(y - (H / 2 + i * s.pitch - s.current)) <= cardH / 2) return i
            }
            return -1
        }

        const updateHover = (e: PointerEvent) => {
            if (e.pointerType !== 'mouse') return
            if (propsRef.current.lyrics) {
                hovered = -1
                canvas.style.cursor = findLyricIndexAt(ly.blocks, e.clientY, H, ly.cur) >= 0 ? 'pointer' : 'default'
                return
            }
            hovered = cardAt(e.clientX, e.clientY)
            canvas.style.cursor = hovered >= 0 ? 'pointer' : 'default'
        }

        const onWheel = (e: WheelEvent) => {
            e.preventDefault()
            const d = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY
            if (propsRef.current.lyrics) {
                ly.target = clampLyrics(ly.target + d)
            } else s.target = clamp(s.target + d)
        }

        const onDown = (e: PointerEvent) => {
            touchY = startY = e.clientY
            startX = e.clientX
        }
        const onMove = (e: PointerEvent) => {
            updateHover(e)
            if (touchY === null || (e.pointerType === 'mouse' && e.buttons !== 1)) return
            const dy = (e.clientY - touchY) * 1.2
            if (propsRef.current.lyrics) {
                ly.target = clampLyrics(ly.target - dy)
            } else s.target = clamp(s.target - dy)
            touchY = e.clientY
        }
        const onUp = (e: PointerEvent) => {
            const { lyrics: L, cards: list, onSeekLine: seekLine, onPlay: play, onMenu: menu } = propsRef.current
            const dist = Math.hypot(e.clientX - startX, e.clientY - startY)
            if (dist < 10) {
                if (L) {
                    if (L.lines.length > 0) {
                        const i = findLyricIndexAt(ly.blocks, e.clientY, H, ly.cur)
                        if (i >= 0) seekLine?.(i)
                    }
                } else {
                    const hit = cardAt(e.clientX, e.clientY)
                    if (hit >= 0) {
                        const k = cardW / 320, cy = H / 2 + hit * s.pitch - s.current
                        const hitMenu = Math.hypot(e.clientX - (W / 2 + cardW / 2 - 28 * k), e.clientY - (cy - cardH / 2 + 28 * k)) <= 24 * k
                        if (hitMenu) menu(list[hit], e.clientX, e.clientY)
                        else play(list[hit])
                    }
                }
            }
            touchY = null
        }
        const onLeave = () => {
            hovered = -1
            canvas.style.cursor = 'default'
        }
        const onContext = (e: MouseEvent) => {
            if (propsRef.current.lyrics) return
            const i = cardAt(e.clientX, e.clientY)
            if (i >= 0) {
                e.preventDefault()
                propsRef.current.onMenu(propsRef.current.cards[i], e.clientX, e.clientY)
            }
        }
        const onKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null
            if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return
            if (!propsRef.current.active) return
            if (propsRef.current.lyrics) {
                const step = { ArrowDown: 100, ArrowUp: -100, PageDown: H * 0.75, PageUp: -H * 0.75, ' ': H * 0.75 }[e.key]
                if (e.key === 'Home') ly.target = 0
                else if (e.key === 'End') ly.target = clampLyrics(Infinity)
                else if (step) ly.target = clampLyrics(ly.target + step)
                else return
                e.preventDefault()
                return
            }
            const step = { ArrowDown: 120, ArrowUp: -120, PageDown: H * 0.8, PageUp: -H * 0.8, ' ': H * 0.8 }[e.key]
            if (e.key === 'Home') s.target = 0
            else if (e.key === 'End') s.target = s.max
            else if (step) s.target = clamp(s.target + step)
            else return
            e.preventDefault()
        }

        canvas.addEventListener('wheel', onWheel, { passive: false })
        canvas.addEventListener('pointerdown', onDown)
        canvas.addEventListener('pointerleave', onLeave)
        canvas.addEventListener('contextmenu', onContext)
        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
        window.addEventListener('keydown', onKey)

        let raf = 0, last = performance.now()
        const frame = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000)
            last = now
            const { active: isAct, cards: list, lyrics: L } = propsRef.current
            if (!isAct) { raf = requestAnimationFrame(frame); return }

            const currentCardId = L?.card.id ?? null
            if (Boolean(L) !== ly.mode || currentCardId !== ly.cardId) {
                ly.mode = Boolean(L)
                ly.cardId = currentCardId
                ly.fade = 0
                hovered = -1
                canvas.style.cursor = 'default'
                ly.lines = null
                ly.activeLine = -1
            }
            ly.fade = Math.min(1, ly.fade + dt * 4.0)
            s.max = Math.max(0, (list.length - 1) * s.pitch)
            s.target = clamp(s.target)
            s.current += (s.target - s.current) * Math.min(1, dt * 7)

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, W, H)

            if (L) {
                const introW = Math.min(360, W * 0.86)
                const introX = W / 2 - introW / 2

                const renderHeader = (topY: number) => {
                    if (topY + 76 < -80 || topY > H + 80) return
                    ctx.fillStyle = '#f5f5f5'
                    ctx.beginPath()
                    ctx.roundRect(introX, topY, introW, 76, 18)
                    ctx.fill()
                    ctx.save()
                    ctx.translate(introX + 10, topY + 10)
                    drawCard(ctx, L.card, 56, 56, getImage(L.card), false, false)
                    ctx.restore()

                    ctx.textAlign = 'left'
                    ctx.textBaseline = 'alphabetic'
                    ctx.fillStyle = '#111'
                    ctx.font = '600 16px "Inter Tight", "Inter", sans-serif'
                    ctx.fillText(L.card.title, introX + 78, topY + 34)
                    ctx.fillStyle = '#9a9a9a'
                    ctx.font = '500 11px "Inter Tight", "Inter", sans-serif'
                    ctx.fillText(L.card.artist, introX + 78, topY + 53)
                    ctx.textAlign = 'right'
                    ctx.fillText(L.card.duration, introX + introW - 14, topY + 43)
                }

                const lines = L.lines.length > 0 ? L.lines : ['Lyrics not available for this track.']
                const active = L.lines.length > 0 ? L.active : 0

                const fresh = ly.lines === null
                if (ly.lines !== lines || ly.layoutW !== W) layoutLyrics(ctx, ly, lines, W)

                if (active !== ly.activeLine) {
                    ly.activeLine = active
                    if (active >= 0 && ly.blocks[active]) {
                        const blk = ly.blocks[active]
                        ly.target = clampLyrics(blk.y + blk.h / 2)
                        if (fresh) ly.cur = ly.target
                    }
                }

                ly.cur += (ly.target - ly.cur) * Math.min(1, dt * 7)

                renderHeader(H / 2 - ly.cur)

                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'
                ctx.font = `600 ${ly.fs}px "Inter Tight", "Inter", sans-serif`
                ly.blocks.forEach((b, i) => {
                    const top = H / 2 + b.y - ly.cur
                    if (top > H + 40 || top + b.h < -40) return
                    ly.act[i] += ((i === active ? 1 : 0) - ly.act[i]) * Math.min(1, dt * 7)
                    const v = Math.round(212 - 195 * ly.act[i])
                    ctx.fillStyle = `rgb(${v},${v},${v})`
                    b.rows.forEach((row, k) => ctx.fillText(row, W / 2, top + k * ly.lh + ly.lh / 2))
                })
            } else {
                for (let i = 0; i < list.length; i++) {
                    const cy = H / 2 + i * s.pitch - s.current
                    if (cy + cardH / 2 < -cardH || cy - cardH / 2 > H + cardH) continue
                    ctx.save()
                    ctx.translate(W / 2 - cardW / 2, cy - cardH / 2)
                    drawCard(ctx, list[i], cardW, cardH, getImage(list[i]), hovered === i)
                    ctx.restore()
                }
            }

            if (ly.fade < 1) {
                ctx.fillStyle = `rgba(255,255,255,${1 - ly.fade})`
                ctx.fillRect(0, 0, W, H)
            }

            if (gl && glState) {
                gl.bindTexture(gl.TEXTURE_2D, glState.tex)
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, off)
                gl.uniform1i(glState.uTex, 0)
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
            }
            raf = requestAnimationFrame(frame)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            cancelAnimationFrame(raf)
            window.removeEventListener('resize', resize)
            canvas.removeEventListener('wheel', onWheel)
            canvas.removeEventListener('pointerdown', onDown)
            canvas.removeEventListener('pointerleave', onLeave)
            canvas.removeEventListener('contextmenu', onContext)
            window.removeEventListener('pointermove', onMove)
            window.removeEventListener('pointerup', onUp)
            window.removeEventListener('keydown', onKey)
        }
    }, [])

    return <canvas ref={glCanvas} className="fixed inset-0 block h-full w-full touch-none" />
}

