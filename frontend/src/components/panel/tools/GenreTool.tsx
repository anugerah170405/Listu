import { useState, useEffect } from 'react'
import { SparklesIcon } from 'lucide-react'
import type { Card } from '../../../types'
import { transformTrackGenre, trackToCard } from '../../../services/api'
import Button from '../../ui/Button'
import SegmentedControl, { type SegmentedOption } from '../../ui/SegmentedControl'
import { showSnackbar } from '../../../utils/snackbar'

type GenreToolProps = {
    card: Card
    cards?: Card[]
    onUpdate: (patch: Partial<Card>, targetId?: string) => void
    onCreatedTrack: (newCard: Card) => void
}

type DurationMode = '15' | '30' | 'full'
type VocalMode = 'vocal' | 'instrumental'

const GENRES = ['Ambient', 'Electronic', 'Jazz', 'Hip-hop', 'Classical', 'Soul', 'Pop', 'Rock']

const DURATION_OPTIONS: SegmentedOption<DurationMode>[] = [
    { id: '15', label: '15s' },
    { id: '30', label: '30s' },
    { id: 'full', label: 'Full' },
]

const VOCAL_OPTIONS: SegmentedOption<VocalMode>[] = [
    { id: 'vocal', label: 'Vocal Remix' },
    { id: 'instrumental', label: 'Instrumental Cover' },
]

export default function GenreTool({ card, cards, onCreatedTrack }: GenreToolProps) {
    const [selectedByTrack, setSelectedByTrack] = useState<Record<string, string | undefined>>({})
    const [durationMode, setDurationMode] = useState<DurationMode>('15')
    const [vocalMode, setVocalMode] = useState<VocalMode>('vocal')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const hasVocals = Boolean(card.vocalsAudio)

    // Check if this card itself or a child transformed track is currently being generated
    const childProcessing = cards?.find(
        (c) =>
            c.processing?.transformer?.status === 'processing' &&
            c.processing.transformer.source_id === card.id
    )
    const isThisCardProcessing = card.processing?.transformer?.status === 'processing'
    const isTransforming = isSubmitting || isThisCardProcessing || Boolean(childProcessing)

    const transformingGenre = childProcessing?.genre ?? (isThisCardProcessing ? card.genre : undefined)
    const selectedGenre = transformingGenre ?? (card.id in selectedByTrack ? selectedByTrack[card.id] : card.genre)

    useEffect(() => {
        setSelectedByTrack((prev) => (card.id in prev ? prev : { ...prev, [card.id]: card.genre }))
    }, [card.id, card.genre])

    const hasAudio = Boolean(card.audio || card.instrumentalAudio)

    const handleSelectGenre = (g: string) => {
        setSelectedByTrack((prev) => ({ ...prev, [card.id]: g }))
    }

    const handleTransform = async () => {
        const targetId = card.id
        if (!targetId || !hasAudio) {
            showSnackbar('Track does not have an audio file to transform', 'error')
            return
        }
        if (!selectedGenre) {
            showSnackbar('Select a target genre first', 'error')
            return
        }
        if (isTransforming) return

        const durationSeconds = durationMode === '15' ? 15 : durationMode === '30' ? 30 : null
        setIsSubmitting(true)
        try {
            const includeVocals = hasVocals ? vocalMode === 'vocal' : false
            const createdTrack = await transformTrackGenre(targetId, selectedGenre, durationSeconds, includeVocals)
            const newCard = trackToCard(createdTrack)
            onCreatedTrack(newCard)
            showSnackbar(`${selectedGenre} version created successfully!`, 'success')
        } catch (err) {
            showSnackbar(err, 'error')
        } finally {
            setIsSubmitting(false)
        }
    }

    const modeLabel = durationMode === 'full' ? 'Full Track' : `${durationMode}s`

    return (
        <div className="space-y-3.5">
            <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-white/50 px-0.5">Target Genre</span>
                <div className="flex flex-wrap gap-2">
                    {GENRES.map((g) => (
                        <Button
                            key={g}
                            variant="chip"
                            size="md"
                            selected={selectedGenre === g}
                            disabled={isTransforming}
                            onClick={() => handleSelectGenre(g)}
                        >
                            {g}
                        </Button>
                    ))}
                </div>
            </div>

            <SegmentedControl
                options={DURATION_OPTIONS}
                value={durationMode}
                onChange={(val) => setDurationMode(val)}
                disabled={isTransforming}
            />

            {hasVocals && (
                <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-white/50 px-0.5">Vocal Track</span>
                    <SegmentedControl
                        options={VOCAL_OPTIONS}
                        value={vocalMode}
                        onChange={(val) => setVocalMode(val)}
                        disabled={isTransforming}
                    />
                </div>
            )}

            <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={handleTransform}
                disabled={!hasAudio || !selectedGenre || isTransforming}
                loading={isTransforming}
                leftIcon={!isTransforming ? <SparklesIcon size={14} className="text-yellow-400" /> : undefined}
            >
                {isTransforming
                    ? `Generating ${transformingGenre ?? selectedGenre}...`
                    : selectedGenre
                      ? `Generate ${selectedGenre} (${modeLabel}${hasVocals && vocalMode === 'instrumental' ? ' • Inst' : ''})`
                      : 'Select a Genre to Transform'}
            </Button>
        </div>
    )
}
