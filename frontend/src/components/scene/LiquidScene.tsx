import { useEffect, useRef } from 'react'
import type { Card, LyricsView } from '../../types'
import { drawCard, type CoverSource } from './cardRenderer'
import { initWebGL } from './shaders'
import { createLyricsState, layoutLyrics, findLyricIndexAt } from './lyricsLayout'

const EMPTY_LYRICS = ['Lyrics not available for this track.']
const MAX_COVER_DIM = 640
const MANUAL_SCROLL_COOLDOWN_MS = 2200

function linesEqual(a: string[] | null, b: string[]): boolean {
    if (a === b) return true
    if (!a || a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false
    }
    return true
}

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
    const dirtyRef = useRef(true)
    const propsRef = useRef({ cards, onPlay, onMenu, lyrics, onSeekLine, active })

    useEffect(() => {
        propsRef.current = { cards, onPlay, onMenu, lyrics, onSeekLine, active }
        dirtyRef.current = true
    }, [cards, onPlay, onMenu, lyrics, onSeekLine, active])

    useEffect(() => {
        const canvas = glCanvas.current!
        const off = document.createElement('canvas')
        const ctx = off.getContext('2d', { alpha: false })!
        const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false })
        const images = new Map<string, CoverSource>()

        const getImage = (c: Card): CoverSource | undefined => {
            if (!c.src) return undefined
            const cached = images.get(c.src)
            if (cached) return cached

            const srcUrl = c.src
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
                const iw = img.naturalWidth
                const ih = img.naturalHeight
                if (iw > MAX_COVER_DIM || ih > MAX_COVER_DIM) {
                    const scale = MAX_COVER_DIM / Math.max(iw, ih)
                    const thumb = document.createElement('canvas')
                    thumb.width = Math.max(1, Math.round(iw * scale))
                    thumb.height = Math.max(1, Math.round(ih * scale))
                    const tctx = thumb.getContext('2d')
                    if (tctx) {
                        tctx.drawImage(img, 0, 0, thumb.width, thumb.height)
                        images.set(srcUrl, thumb)
                    }
                }
                dirtyRef.current = true
            }
            img.src = srcUrl
            images.set(srcUrl, img)
            return img
        }

        let W = 0, H = 0, dpr = 1, cardW = 300, cardH = 400
        let texAllocated = false
        let lastManualLyricsScrollAt = 0
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
            s.max = Math.max(0, (propsRef.current.cards.length - 1) * s.pitch)
            texAllocated = false
            dirtyRef.current = true
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
                if (hovered !== -1) {
                    hovered = -1
                    dirtyRef.current = true
                }
                const hasLines = propsRef.current.lyrics.lines.length > 0
                canvas.style.cursor = hasLines && findLyricIndexAt(ly.blocks, e.clientY, H, ly.cur) >= 0 ? 'pointer' : 'default'
                return
            }
            const nextHover = cardAt(e.clientX, e.clientY)
            if (nextHover !== hovered) {
                hovered = nextHover
                dirtyRef.current = true
            }
            canvas.style.cursor = hovered >= 0 ? 'pointer' : 'default'
        }

        const onWheel = (e: WheelEvent) => {
            e.preventDefault()
            const d = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY
            if (propsRef.current.lyrics) {
                ly.target = clampLyrics(ly.target + d)
                lastManualLyricsScrollAt = performance.now()
            } else {
                s.target = clamp(s.target + d)
            }
            dirtyRef.current = true
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
                lastManualLyricsScrollAt = performance.now()
            } else {
                s.target = clamp(s.target - dy)
            }
            touchY = e.clientY
            dirtyRef.current = true
        }
        const onUp = (e: PointerEvent) => {
            const { lyrics: L, cards: list, onSeekLine: seekLine, onPlay: play, onMenu: menu } = propsRef.current
            const dist = Math.hypot(e.clientX - startX, e.clientY - startY)
            if (dist < 10) {
                if (L) {
                    if (L.lines.length > 0) {
                        const i = findLyricIndexAt(ly.blocks, e.clientY, H, ly.cur)
                        if (i >= 0) {
                            lastManualLyricsScrollAt = 0
                            seekLine?.(i)
                        }
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
            if (hovered !== -1) {
                hovered = -1
                dirtyRef.current = true
            }
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
                lastManualLyricsScrollAt = performance.now()
                dirtyRef.current = true
                e.preventDefault()
                return
            }
            const step = { ArrowDown: 120, ArrowUp: -120, PageDown: H * 0.8, PageUp: -H * 0.8, ' ': H * 0.8 }[e.key]
            if (e.key === 'Home') s.target = 0
            else if (e.key === 'End') s.target = s.max
            else if (step) s.target = clamp(s.target + step)
            else return
            dirtyRef.current = true
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
            if (!isAct) {
                raf = requestAnimationFrame(frame)
                return
            }

            const currentCardId = L?.card.id ?? null
            if (Boolean(L) !== ly.mode || currentCardId !== ly.cardId) {
                ly.mode = Boolean(L)
                ly.cardId = currentCardId
                ly.cur = 0
                ly.target = 0
                ly.fade = 0
                hovered = -1
                canvas.style.cursor = 'default'
                ly.lines = null
                ly.activeLine = -2
                lastManualLyricsScrollAt = 0
                dirtyRef.current = true
            }

            s.max = Math.max(0, (list.length - 1) * s.pitch)
            s.target = clamp(s.target)

            let lyricsAnimating = false
            if (L) {
                const hasRealLyrics = L.lines.length > 0
                const lines = hasRealLyrics ? L.lines : EMPTY_LYRICS
                const activeIdx = hasRealLyrics ? L.active : 0

                if (!linesEqual(ly.lines, lines) || ly.layoutW !== W) {
                    layoutLyrics(ctx, ly, lines, W)
                    dirtyRef.current = true
                }

                if (activeIdx !== ly.activeLine) {
                    const fresh = ly.activeLine === -2
                    ly.activeLine = activeIdx
                    const recentlyScrolledManually = now - lastManualLyricsScrollAt < MANUAL_SCROLL_COOLDOWN_MS
                    if (!recentlyScrolledManually || fresh) {
                        if (activeIdx >= 0 && ly.blocks[activeIdx]) {
                            const blk = ly.blocks[activeIdx]
                            ly.target = clampLyrics(blk.y + blk.h / 2)
                        } else {
                            ly.target = 0
                        }
                        if (fresh) ly.cur = ly.target
                    }
                    dirtyRef.current = true
                }

                for (let i = 0; i < ly.act.length; i++) {
                    const targetAct = i === activeIdx ? 1 : 0
                    if (Math.abs(targetAct - ly.act[i]) > 0.004) {
                        lyricsAnimating = true
                        break
                    }
                }
            }

            const scrollDiff = Math.abs(s.target - s.current)
            const lyricScrollDiff = Math.abs(ly.target - ly.cur)
            const isFading = ly.fade < 1
            const isMoving = L ? lyricScrollDiff > 0.15 || lyricsAnimating : scrollDiff > 0.15

            if (!dirtyRef.current && !isMoving && !isFading) {
                raf = requestAnimationFrame(frame)
                return
            }

            dirtyRef.current = false

            if (isFading) {
                ly.fade = Math.min(1, ly.fade + dt * 4.0)
            }

            // Frame-rate independent exponential smoothing
            const lerpFactor = 1 - Math.exp(-7 * dt)
            if (scrollDiff > 0.05) {
                s.current += (s.target - s.current) * lerpFactor
            } else {
                s.current = s.target
            }

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
                    ctx.fillText(L.card.title.length > 28 ? L.card.title.slice(0, 28) + '...' : L.card.title, introX + 78, topY + 34)
                    ctx.fillStyle = '#9a9a9a'
                    ctx.font = '500 11px "Inter Tight", "Inter", sans-serif'
                    ctx.fillText(L.card.artist, introX + 78, topY + 53)
                    ctx.textAlign = 'right'
                    ctx.fillText(L.card.duration, introX + introW - 14, topY + 43)
                }

                const activeIdx = L.lines.length > 0 ? L.active : 0

                if (lyricScrollDiff > 0.05) {
                    ly.cur += (ly.target - ly.cur) * lerpFactor
                } else {
                    ly.cur = ly.target
                }

                renderHeader(H / 2 - ly.cur)

                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'
                ctx.font = `600 ${ly.fs}px "Inter Tight", "Inter", sans-serif`
                ly.blocks.forEach((b, i) => {
                    const top = H / 2 + b.y - ly.cur
                    const targetAct = i === activeIdx ? 1 : 0
                    if (Math.abs(targetAct - ly.act[i]) > 0.002) {
                        ly.act[i] += (targetAct - ly.act[i]) * lerpFactor
                    } else {
                        ly.act[i] = targetAct
                    }
                    if (top > H + 40 || top + b.h < -40) return
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
                if (!texAllocated) {
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, off)
                    texAllocated = true
                } else {
                    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, off)
                }
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
