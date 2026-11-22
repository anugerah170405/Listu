import { useState } from 'react'
import { RotateCcwIcon, Trash2Icon, FileTextIcon } from 'lucide-react'
import type { Card, Stem } from '../../../types'
import { deleteProcessedAudio, deleteTrackLyrics } from '../../../services/api'
import Button from '../../ui/Button'
import { showSnackbar } from '../../../utils/snackbar'

type DeleteToolProps = {
    card: Card
    onStem: (s: Stem) => void
    onUpdate: (patch: Partial<Card>, targetId?: string) => void
    onDeleteTrack: (targetId?: string) => void
}

export default function DeleteTool({ card, onStem, onUpdate, onDeleteTrack }: DeleteToolProps) {
    const [isDeletingLyrics, setIsDeletingLyrics] = useState(false)
    const [isDeletingAudio, setIsDeletingAudio] = useState(false)
    const hasProcessedAudio = Boolean(card.vocalsAudio || card.instrumentalAudio)
    const isAudioProcessing = card.processing?.separator?.status === 'processing'
    const isLyricsProcessing = card.processing?.lyrics?.status === 'processing'
    const isTransformerProcessing = card.processing?.transformer?.status === 'processing'
    const isAnyTaskProcessing = isAudioProcessing || isLyricsProcessing || isTransformerProcessing
    const hasLyrics = Boolean((card.lyrics && card.lyrics.length > 0) || isLyricsProcessing)
    const canDeleteAudio = Boolean(hasProcessedAudio || isAudioProcessing)

    const handleDeleteLyrics = async () => {
        const targetId = card.id
        if (!targetId || !hasLyrics || isDeletingLyrics) return

        setIsDeletingLyrics(true)
        try {
            await deleteTrackLyrics(targetId)
            onUpdate(
                {
                    lyrics: undefined,
                    lyricTimes: undefined,
                    language: undefined,
                    processing: {
                        ...card.processing,
                        lyrics: undefined,
                    },
                },
                targetId
            )
            showSnackbar(
                isLyricsProcessing ? 'Lyrics processing cancelled and reset.' : 'Track lyrics deleted successfully.',
                'success'
            )
        } catch (err) {
            showSnackbar(err, 'error')
        } finally {
            setIsDeletingLyrics(false)
        }
    }

    const handleDeleteAudio = async () => {
        const targetId = card.id
        if (!targetId || !canDeleteAudio || isDeletingAudio) return

        setIsDeletingAudio(true)
        try {
            await deleteProcessedAudio(targetId)
            onStem('full')
            onUpdate(
                {
                    vocalsAudio: undefined,
                    instrumentalAudio: undefined,
                    processing: {
                        ...card.processing,
                        separator: undefined,
                    },
                },
                targetId
            )
            showSnackbar(
                isAudioProcessing ? 'Audio separation cancelled and reset.' : 'Separated stems deleted. Reverted to original track.',
                'success'
            )
        } catch (err) {
            showSnackbar(err, 'error')
        } finally {
            setIsDeletingAudio(false)
        }
    }

    const audioButtonText = isDeletingAudio
        ? (isAudioProcessing ? 'Cancelling...' : 'Deleting Separated Audio...')
        : isAudioProcessing
            ? 'Cancel Audio Separation'
            : 'Delete Separated Audio'

    const lyricsButtonText = isDeletingLyrics
        ? (isLyricsProcessing ? 'Cancelling...' : 'Deleting Lyrics...')
        : isLyricsProcessing
            ? 'Cancel Lyrics Processing'
            : 'Delete Lyrics'

    return (
        <div className="space-y-2.5">
            <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={handleDeleteAudio}
                disabled={!canDeleteAudio || isDeletingAudio}
                loading={isDeletingAudio}
                leftIcon={<RotateCcwIcon size={14} />}
            >
                {audioButtonText}
            </Button>

            <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={handleDeleteLyrics}
                disabled={!hasLyrics || isDeletingLyrics}
                loading={isDeletingLyrics}
                leftIcon={<FileTextIcon size={14} />}
            >
                {lyricsButtonText}
            </Button>

            <Button
                variant="danger-ghost"
                size="md"
                fullWidth
                onClick={() => onDeleteTrack(card.id)}
                disabled={isDeletingAudio || isDeletingLyrics || isAnyTaskProcessing}
                title={isAnyTaskProcessing ? 'Cannot delete track while AI task is running' : 'Delete Track'}
                leftIcon={<Trash2Icon size={14} />}
                className="bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300"
            >
                Delete Track
            </Button>
        </div>
    )
}
