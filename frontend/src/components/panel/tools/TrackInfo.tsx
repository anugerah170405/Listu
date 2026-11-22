import { useState, useRef, useEffect, type ChangeEvent, type KeyboardEvent } from 'react'
import type { Card } from '../../../types'
import { UploadIcon, Trash2Icon, MusicIcon } from 'lucide-react'
import { uploadTrackCover } from '../../../services/api'
import TextInput from '../../ui/TextInput'
import { showSnackbar } from '../../../utils/snackbar'
import { formatDate } from '../../../utils/format'

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

    const commitMetadata = () => {
        const cleanTitle = title.trim() || 'Untitled Track'
        const cleanArtist = artist.trim() || 'Unknown Artist'

        setTitle(cleanTitle)
        setArtist(cleanArtist)

        if (cleanTitle !== card.title || cleanArtist !== card.artist) {
            onUpdate({ title: cleanTitle, artist: cleanArtist })
            showSnackbar('Track metadata updated', 'success')
        }
    }

    const blurOnEnter = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') e.currentTarget.blur()
    }

    const lineCount = card.lyrics?.length ?? 0
    const synced = card.lyricTimes?.filter((t) => typeof t === 'number').length ?? 0
    const sources = [
        card.audio && 'Original',
        card.vocalsAudio && 'Vocals',
        card.instrumentalAudio && 'Instrumental',
    ].filter(Boolean)
    const details: [string, string][] = [
        ['Duration', card.duration || '-'],
        ['Genre', card.genre || '-'],
        ['Language', card.language || '-'],
        ['Lyrics', lineCount ? `${lineCount} lines${synced ? ` (${synced} synced)` : ''}` : 'None'],
        ['Audio', sources.length ? sources.join(', ') : 'None'],
        ['Track ID', card.id],
        ['Created', formatDate(card.createdAt)],
        ['Updated', formatDate(card.updatedAt)],
    ]

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
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/55 opacity-0 transition-opacity duration-200 group-hover/thumb:opacity-100">
                            <button
                                type="button"
                                title="Change Cover"
                                aria-label="Change Cover"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    fileInputRef.current?.click()
                                }}
                                className="grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white transition-all hover:bg-white hover:text-black active:scale-90 cursor-pointer"
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
                                    className="grid h-8 w-8 place-items-center rounded-full bg-red-500/25 text-red-200 transition-all hover:bg-red-500 hover:text-white active:scale-90 cursor-pointer"
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
                        onBlur={commitMetadata}
                        onKeyDown={blurOnEnter}
                        placeholder="Track title"
                    />
                    <TextInput
                        inputSize="sm"
                        label="Artist"
                        value={artist}
                        onChange={(e) => setArtist(e.target.value)}
                        onBlur={commitMetadata}
                        onKeyDown={blurOnEnter}
                        placeholder="Artist name"
                    />
                </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-2xl bg-white/[0.04] p-3 text-[11px]">
                {details.map(([label, value]) => (
                    <div key={label} className="min-w-0">
                        <dt className="text-white/35">{label}</dt>
                        <dd className="truncate font-medium text-white/80" title={value}>
                            {value}
                        </dd>
                    </div>
                ))}
            </dl>
        </div>
    )
}
