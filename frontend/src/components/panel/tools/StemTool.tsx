import type { Card, Stem } from '../../../types'
import { separateTrackAudio } from '../../../services/api'
import { SparklesIcon } from 'lucide-react'
import Button from '../../ui/Button'
import SegmentedControl from '../../ui/SegmentedControl'
import { showSnackbar } from '../../../utils/snackbar'
import { errorMessage } from '../../../utils/error'

type StemToolProps = {
    card: Card
    stem: Stem
    onStem: (s: Stem) => void
    onUpdate?: (patch: Partial<Card>) => void
}

const STEM_OPTIONS: { id: Stem; label: string }[] = [
    { id: 'full', label: 'Full' },
    { id: 'instrumental', label: 'Instrumental' },
    { id: 'vocal', label: 'Vocals' },
]

export default function StemTool({ card, stem, onStem, onUpdate }: StemToolProps) {
    const handleSeparateAI = async () => {
        if (!card.id || !card.audio) {
            showSnackbar('Track not saved or audio not found', 'error')
            return
        }

        onUpdate?.({ isSeparating: true, separationError: undefined })
        try {
            const { audio } = await separateTrackAudio(card.id)
            onUpdate?.({
                isSeparating: false,
                vocalsAudio: audio?.vocals_url ?? undefined,
                instrumentalAudio: audio?.instrumental_url ?? undefined,
            })
            showSnackbar('Vocals and instrumental separated successfully!', 'success')
        } catch (err) {
            const message = errorMessage(err, 'Failed to separate audio')
            onUpdate?.({ isSeparating: false, separationError: message })
            showSnackbar(message, 'error')
        }
    }

    const handleStemChange = (s: Stem) => {
        onStem(s)
        showSnackbar(`Audio set to: ${STEM_OPTIONS.find((o) => o.id === s)?.label ?? s}`, 'success')
    }

    if (!card.audio) {
        return <p className="text-xs text-white/50 text-center py-2">No audio found. Upload a track to separate vocals.</p>
    }

    const separated = Boolean(card.vocalsAudio)

    return (
        <div className="space-y-3">
            <SegmentedControl options={STEM_OPTIONS} value={stem} onChange={handleStemChange} disabled={!separated} />

            <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={handleSeparateAI}
                disabled={card.isSeparating || separated}
                loading={card.isSeparating}
                leftIcon={!card.isSeparating && !separated ? <SparklesIcon size={14} className="text-yellow-400" /> : undefined}
            >
                {card.isSeparating ? (
                    'Processing AI...'
                ) : separated ? (
                    <span className="text-emerald-400">✓ Vocals Separated</span>
                ) : (
                    'Separate Vocals (AI)'
                )}
            </Button>
        </div>
    )
}
