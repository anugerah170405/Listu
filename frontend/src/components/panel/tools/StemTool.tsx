import type { Card, Stem } from '../../../types'
import { separateAudioFile } from '../../../services/api'
import { Loader2Icon, SparklesIcon } from 'lucide-react'

type StemToolProps = {
    card: Card
    stem: Stem
    onStem: (s: Stem) => void
    onUpdate?: (patch: Partial<Card>) => void
}

const STEM_OPTIONS: { id: Stem; label: string }[] = [
    { id: 'full', label: 'Lengkap' },
    { id: 'instrumental', label: 'Instrumental' },
    { id: 'vocal', label: 'Vokal' },
]

export default function StemTool({ card, stem, onStem, onUpdate }: StemToolProps) {

    const handleSeparateAI = async () => {
        if (!card.audio && !card.audioFile) return

        // 1. Catat status bahwa lagu ini SEDANG DIPROSES
        onUpdate?.({ isSeparating: true, separationError: undefined })

        try {
            let fileToSend = card.audioFile

            if (!fileToSend && card.audio) {
                const response = await fetch(card.audio)
                const blob = await response.blob()
                fileToSend = new File([blob], `${card.title || 'audio'}.mp3`, {
                    type: blob.type || 'audio/mpeg'
                })
            }

            if (!fileToSend) throw new Error('File audio tidak ditemukan pada lagu ini.')

            const result = await separateAudioFile(fileToSend)

            onUpdate?.({
                isSeparating: false,
                vocalsAudio: result.vocals_url ?? undefined,
                instrumentalAudio: result.instrumental_url ?? undefined,
            })

        } catch (err: any) {
            onUpdate?.({
                isSeparating: false,
                separationError: err.message || 'Gagal memisahkan vokal dengan AI'
            })
        }
    }

    if (!card.audio) {
        return (
            <p className="text-[12px] leading-relaxed text-white/50">
                Lagu ini belum punya file audio. Unggah lagu lewat tombol Add untuk memisahkan vokalnya.
            </p>
        )
    }

    return (
        <div>
            <div className="flex rounded-full bg-white/8 p-1">
                {STEM_OPTIONS.map((o) => (
                    <button
                        key={o.id}
                        onClick={() => onStem(o.id)}
                        className={`flex-1 rounded-full py-2 text-[12px] font-medium transition-colors cursor-pointer ${stem === o.id ? 'bg-white text-neutral-900' : 'text-white/70 hover:text-white'}`}
                    >
                        {o.label}
                    </button>
                ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-white/40">
                Dipisah secara langsung saat diputar dengan membatalkan kanal tengah. Hasil terbaik pada rekaman stereo; rekaman mono tidak bisa dipisah.
            </p>

            {/* Tombol Pemisahan AI langsung dari Card */}
            <div className="mt-4 border-t border-white/10 pt-4">
                <button
                    onClick={handleSeparateAI}
                    disabled={card.isSeparating || Boolean(card.vocalsAudio)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 px-4 text-[12px] font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-50 cursor-pointer"
                >
                    {card.isSeparating ? (
                        <>
                            <Loader2Icon className="animate-spin" size={15} />
                            <span>Memproses BS-RoFormer AI...</span>
                        </>
                    ) : card.vocalsAudio ? (
                        <span className="text-emerald-400">✓ Vokal & Musik Sudah Terpisah</span>
                    ) : (
                        <>
                            <SparklesIcon size={15} className="text-yellow-400" />
                            <span>Pisahkan Vokal (AI)</span>
                        </>
                    )}
                </button>

                {card.separationError && (
                    <p className="mt-2 text-[11px] text-red-400">{card.separationError}</p>
                )}
            </div>
        </div>
    )
}
