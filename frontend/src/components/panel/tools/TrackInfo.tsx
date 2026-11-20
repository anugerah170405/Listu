import { useState, useRef, useEffect, type ChangeEvent } from 'react'
import type { Card } from '../../../types'
import { UploadIcon, Trash2Icon, MusicIcon } from 'lucide-react'
import { uploadTrackCover } from '../../../services/api'
import Button from '../../ui/Button'
import TextInput from '../../ui/TextInput'
import { showSnackbar } from '../../../utils/snackbar'

type TrackInfoProps = {
    card: Card
    onUpdate: (patch: Partial<Card>) => void
}

export default function TrackInfo({ card, onUpdate }: TrackInfoProps) {
    const [title, setTitle] = useState(card.title)
    const [artist, setArtist] = useState(card.artist)
    const [coverUrl, setCoverUrl] = useState(card.src ?? '')
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setTitle(card.title)
        setArtist(card.artist)
        setCoverUrl(card.src ?? '')
    }, [card.id, card.title, card.artist, card.src])

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const localPreview = URL.createObjectURL(file)
        setCoverUrl(localPreview)

        try {
            setUploading(true)
            const updated = await uploadTrackCover(card.id, file)
            const src = updated?.cover_url ?? localPreview
            setCoverUrl(src)
            onUpdate({ src })
            showSnackbar('Track cover updated successfully', 'success')
        } catch {
            onUpdate({ src: localPreview })
            showSnackbar('Failed to save cover to server', 'error')
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleRemoveCover = () => {
        setCoverUrl('')
        onUpdate({ src: undefined })
        showSnackbar('Track cover removed', 'success')
    }

    const handleSave = () => {
        const cleanTitle = title.trim() || 'Untitled Track'
        const cleanArtist = artist.trim() || 'Unknown Artist'
        const cleanCover = coverUrl.trim() || undefined

        setTitle(cleanTitle)
        setArtist(cleanArtist)
        onUpdate({ title: cleanTitle, artist: cleanArtist, src: cleanCover })
        showSnackbar('Track metadata saved successfully', 'success')
    }

    const hasChanges =
        title !== card.title ||
        artist !== card.artist ||
        (coverUrl || undefined) !== (card.src || undefined)

    return (
        <div className="space-y-3">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
            />

            <div className="flex items-center gap-3">
                <div
                    className="group/thumb relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-white/[0.06] cursor-pointer"
                    onClick={() => !uploading && !coverUrl && fileInputRef.current?.click()}
                >
                    {coverUrl ? (
                        <img
                            src={coverUrl}
                            alt={title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover/thumb:scale-105"
                        />
                    ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-white/30 transition-colors group-hover/thumb:text-white/60">
                            <MusicIcon width={22} height={22} />
                            <span className="text-[10px] font-medium">Cover</span>
                        </div>
                    )}

                    {uploading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/55 backdrop-blur-xs opacity-0 transition-opacity duration-200 group-hover/thumb:opacity-100">
                            <button
                                type="button"
                                title="Change Cover"
                                aria-label="Change Cover"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    fileInputRef.current?.click()
                                }}
                                className="grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white backdrop-blur-md transition-all hover:bg-white hover:text-black active:scale-90 cursor-pointer"
                            >
                                <UploadIcon width={14} height={14} />
                            </button>
                            {coverUrl && (
                                <button
                                    type="button"
                                    title="Remove Cover"
                                    aria-label="Remove Cover"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleRemoveCover()
                                    }}
                                    className="grid h-8 w-8 place-items-center rounded-full bg-red-500/25 text-red-200 backdrop-blur-md transition-all hover:bg-red-500 hover:text-white active:scale-90 cursor-pointer"
                                >
                                    <Trash2Icon width={14} height={14} />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex flex-1 flex-col justify-between gap-1.5 min-w-0">
                    <TextInput
                        inputSize="sm"
                        label="Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Track title"
                    />
                    <TextInput
                        inputSize="sm"
                        label="Artist"
                        value={artist}
                        onChange={(e) => setArtist(e.target.value)}
                        placeholder="Artist name"
                    />
                </div>
            </div>

            <div className="pt-1">
                <Button
                    variant="primary"
                    size="md"
                    fullWidth
                    onClick={handleSave}
                    disabled={!hasChanges}
                >
                    Save
                </Button>
            </div>
        </div>
    )
}
