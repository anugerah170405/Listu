import { useState } from 'react'
import type { Card } from '../../../types'

type WriteToolProps = {
    card: Card
    onUpdate: (patch: Partial<Card>) => void
}

const btn = 'rounded-full px-4 py-2 text-[12px] font-medium transition-colors cursor-pointer'

export default function WriteTool({ card, onUpdate }: WriteToolProps) {
    const [text, setText] = useState((card.lyrics ?? []).join('\n'))
    const [saved, setSaved] = useState(false)

    const save = () => {
        const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean)
        onUpdate({ lyrics: lines.length ? lines : undefined, lyricTimes: undefined })
        setSaved(true)
        setTimeout(() => setSaved(false), 1600)
    }

    return (
        <div>
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Tulis lirik, satu baris per baris"
                className="h-40 w-full resize-none rounded-2xl bg-white/8 p-3.5 text-[13px] leading-relaxed outline-none placeholder:text-white/30 focus:ring-1 focus:ring-white/40"
            />
            <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-white/40">
                    {saved ? 'Tersimpan' : 'Menyimpan akan mengatur ulang sinkronisasi'}
                </span>
                <button onClick={save} className={`${btn} bg-white text-neutral-900 hover:bg-[#ff4a1c] hover:text-white`}>
                    Simpan
                </button>
            </div>
        </div>
    )
}
