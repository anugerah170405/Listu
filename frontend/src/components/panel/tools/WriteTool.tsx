import { useState } from 'react'
import type { Card } from '../../../types'
import { SparkleIcon } from 'lucide-react'
import { generateTrackLyrics } from '../../../services/api'
import { LANGUAGE_OPTIONS } from '../../../constants/languages'
import { parseLyrics } from '../../../utils/lyrics'
import { showSnackbar } from '../../../utils/snackbar'
import { showError } from '../../../utils/error'
import Button from '../../ui/Button'
import LanguageSelect from '../../ui/LanguageSelect'
import TextArea from '../../ui/TextArea'

type WriteToolProps = {
    card: Card
    onUpdate: (patch: Partial<Card>) => void
}

export default function WriteTool({ card, onUpdate }: WriteToolProps) {
    const [text, setText] = useState((card.lyrics ?? []).join('\n'))
    const [selectedLang, setSelectedLang] = useState(card.language ?? '')
    const [detectedLang, setDetectedLang] = useState<string | null>(card.language ?? null)
    const [isGenerating, setIsGenerating] = useState(false)

    const save = () => {
        const { lines, times } = parseLyrics(text)
        onUpdate({
            lyrics: lines.length ? lines : undefined,
            language: selectedLang || card.language,
            ...(times && { lyricTimes: times }),
        })
        showSnackbar(lines.length ? 'Lyrics saved successfully' : 'Lyrics removed', 'success')
    }

    const handleGenerateLyrics = async () => {
        if (!card.id || (!card.audio && !card.vocalsAudio)) {
            showSnackbar('Track does not have an audio file for lyrics extraction', 'error')
            return
        }

        setIsGenerating(true)
        try {
            const { lyrics } = await generateTrackLyrics(card.id, selectedLang || undefined)
            const lines = lyrics?.lines ?? []
            const times = lyrics?.line_times ?? []
            const lang = lyrics?.language ?? null

            setText(lines.join('\n'))
            setDetectedLang(lang)
            onUpdate({
                lyrics: lines.length ? lines : undefined,
                lyricTimes: times.length ? times : undefined,
                language: lang || undefined,
            })

            const label = LANGUAGE_OPTIONS.find((o) => o.value === lang)?.label ?? lang ?? 'Auto'
            showSnackbar(`Lyrics generated successfully! Language: ${label}`, 'success')
        } catch (err) {
            showError(err, 'Failed to generate lyrics')
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <LanguageSelect value={selectedLang} onChange={setSelectedLang} disabled={isGenerating} />
                <Button
                    leftIcon={<SparkleIcon size={15} />}
                    fullWidth
                    variant="secondary"
                    size="md"
                    loading={isGenerating}
                    onClick={handleGenerateLyrics}
                >
                    {isGenerating ? 'Listening...' : 'Generate Lyrics (AI)'}
                </Button>
            </div>

            <TextArea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write lyrics, one line per line"
                className="h-44"
                disabled={isGenerating}
            />

            {detectedLang && (
                <p className="text-[11px] text-white/40 text-right -mt-1">
                    Detected language: <span className="text-white/70 font-medium uppercase">{detectedLang}</span>
                </p>
            )}

            <Button variant="primary" size="md" fullWidth onClick={save} disabled={isGenerating}>
                Save
            </Button>
        </div>
    )
}
