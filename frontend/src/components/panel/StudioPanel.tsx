import { useState, type ReactNode, type ComponentType } from 'react'
import type { Card, Stem } from '../../types'
import { ChevronDownIcon, XIcon as CloseIcon, PenIcon, SplitIcon, TagIcon, InfoIcon, Trash2Icon } from 'lucide-react'
import IconButton from '../ui/IconButton'
import TrackInfo from './tools/TrackInfo'
import StemTool from './tools/StemTool'
import GenreTool from './tools/GenreTool'
import LyricsTool from './tools/LyricsTool'
import DeleteTool from './tools/DeleteTool'

type ToolId = 'info' | 'stem' | 'genre' | 'lyrics' | 'delete'

type Props = {
    card: Card
    cards?: Card[]
    time: number
    playing: boolean
    stem: Stem
    onStem: (s: Stem) => void
    onUpdate: (patch: Partial<Card>, targetId?: string) => void
    onCreatedTrack: (newCard: Card) => void
    onDeleteTrack: (targetId?: string) => void
    onSeek: (t: number) => void
    onTogglePlay: () => void
    onClose: () => void
}

export default function StudioPanel(props: Props) {
    const [open, setOpen] = useState<ToolId | null>(null)
    const { card } = props

    const tools: { id: ToolId; label: string; Icon: ComponentType<{ width?: number; height?: number; className?: string }>; body: ReactNode }[] = [
        { id: 'info', label: 'Track Info', Icon: InfoIcon, body: <TrackInfo key={card.id} card={card} onUpdate={props.onUpdate} /> },
        { id: 'stem', label: 'Stem Separator', Icon: SplitIcon, body: <StemTool card={card} stem={props.stem} onStem={props.onStem} onUpdate={props.onUpdate} /> },
        { id: 'genre', label: 'Genre Transformer', Icon: TagIcon, body: <GenreTool card={card} cards={props.cards} onUpdate={props.onUpdate} onCreatedTrack={props.onCreatedTrack} /> },
        { id: 'lyrics', label: 'Lyrics', Icon: PenIcon, body: <LyricsTool key={card.id} {...props} /> },
        { id: 'delete', label: 'Manage Audio & Track', Icon: Trash2Icon, body: <DeleteTool card={card} onStem={props.onStem} onUpdate={props.onUpdate} onDeleteTrack={props.onDeleteTrack} /> },
    ]

    return (
        <aside className="fixed inset-y-0 right-0 z-20 w-[min(92vw,380px)] animate-[studio-in_0.4s_cubic-bezier(0.3,1,0.3,1)] overflow-y-auto border-l border-white/10 bg-[#0d0d0d] p-3 text-white">
            <div className="sticky top-0 z-10 -mx-1 flex items-center justify-between bg-[#0d0d0d]/95 px-5 pt-4 pb-3 backdrop-blur-xl">
                <span className="text-xs font-semibold tracking-[0.22em] text-white/50">STUDIO</span>
                <IconButton
                    aria-label="Close studio"
                    size="sm"
                    variant="ghost"
                    onClick={props.onClose}
                >
                    <CloseIcon width={16} height={16} />
                </IconButton>
            </div>
            <ul>
                {tools.map(({ id, label, Icon, body }) => {
                    const isOpen = open === id
                    return (
                        <li key={id}>
                            <button
                                onClick={() => setOpen(isOpen ? null : id)}
                                aria-expanded={isOpen}
                                className={`flex w-full items-center gap-4 rounded-full px-4 py-3 text-sm transition-colors hover:bg-white/10 cursor-pointer ${isOpen ? 'bg-white/10' : ''}`}
                            >
                                <Icon width={19} height={19} />
                                <span className="flex-1 text-left">{label}</span>
                                <ChevronDownIcon width={16} height={16} className={`text-white/45 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                            </button>
                            <div className={`px-3 pt-3 pb-4 ${isOpen ? 'block' : 'hidden'}`}>{body}</div>
                        </li>
                    )
                })}
            </ul>
        </aside>
    )
}
