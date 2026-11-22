import { useState } from 'react'
import type { Card, Stem } from '../../../types'
import { separateTrackAudio } from '../../../services/api'
import { RotateCcwIcon, SparklesIcon } from 'lucide-react'
import Button from '../../ui/Button'
import SegmentedControl from '../../ui/SegmentedControl'
import { showSnackbar } from '../../../utils/snackbar'

type StemToolProps = {
    card: Card
    stem: Stem
    onStem: (s: Stem) => void
    onUpdate: (patch: Partial<Card>, targetId?: string) => void
}

const STEM_OPTIONS: { id: Stem; label: string }[] = [
    { id: 'full', label: 'Full' },
    { id: 'instrumental', label: 'Instrumental' },
    { id: 'vocal', label: 'Vocals' },
]

export default function StemTool({ card, stem, onStem, onUpdate }: StemToolProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const separated = Boolean(card.vocalsAudio)
    const isSeparating = isSubmitting || card.processing?.separator?.status === 'processing'
    const isFailed = card.processing?.separator?.status === 'failed'

    const handleSeparateAI = async () => {
        const targetId = card.id
        if (!targetId || !card.audio) {
            showSnackbar('Track not saved or audio not found', 'error')
            return
        }
        if (isSeparating) return

        setIsSubmitting(true)
        onUpdate(
            {
                processing: {
                    ...card.processing,
                    separator: { status: 'processing', updated_at: new Date().toISOString() },
                },
            },
            targetId
        )
        try {
            const updated = await separateTrackAudio(targetId)
            onUpdate(
                {
                    vocalsAudio: updated.audio?.vocals_url ?? undefined,
                    instrumentalAudio: updated.audio?.instrumental_url ?? undefined,
                    processing: updated.processing,
                },
                targetId
            )
            showSnackbar('Vocals and instrumental separated successfully!', 'success')
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err || 'Failed to separate audio')
            onUpdate(
                {
                    processing: {
                        ...card.processing,
                        separator: { status: 'failed', error: message, updated_at: new Date().toISOString() },
                    },
                },
                targetId
            )
            showSnackbar(err, 'error')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleStemChange = (s: Stem) => {
        onStem(s)
        showSnackbar(`Audio set to: ${STEM_OPTIONS.find((o) => o.id === s)?.label ?? s}`, 'success')
    }

    if (!card.audio) {
        return <p className="text-xs text-white/50 text-center py-2">No audio found. Upload a track to separate vocals.</p>
    }

    return (
        <div className="space-y-3">
            <SegmentedControl
                options={STEM_OPTIONS}
                value={stem}
                onChange={handleStemChange}
                disabled={!separated || isSeparating}
            />

            <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={handleSeparateAI}
                disabled={isSeparating || separated}
                loading={isSeparating}
                leftIcon={
                    isFailed ? (
                        <RotateCcwIcon size={14} />
                    ) : !isSeparating && !separated ? (
                        <SparklesIcon size={14} className="text-yellow-400" />
                    ) : undefined
                }
            >
                {isSeparating ? (
                    'Separating Vocals...'
                ) : separated ? (
                    <span className="text-emerald-400">✓ Vocals Separated</span>
                ) : isFailed ? (
                    'Retry Separation'
                ) : (
                    'Separate Vocals'
                )}
            </Button>
            {isFailed && card.processing?.separator?.error && (
                <p className="text-[11px] text-red-400 text-center px-1">
                    {card.processing.separator.error}
                </p>
            )}
        </div>
    )
}
