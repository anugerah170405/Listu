import { useState, type ReactNode, type ComponentType } from 'react'
import type { Card, Stem } from '../../types'
import { ChevronDownIcon, ClockIcon, XIcon as CloseIcon, PenIcon, SplitIcon, TagIcon, InfoIcon } from 'lucide-react'
import IconButton from '../ui/IconButton'
import TrackInfo from './tools/TrackInfo'
import StemTool from './tools/StemTool'
import GenreTool from './tools/GenreTool'
import WriteTool from './tools/WriteTool'
import SyncTool from './tools/SyncTool'

type ToolId = 'info' | 'stem' | 'genre' | 'write' | 'sync'

type Props = {
    card: Card
    time: number
    playing: boolean
    stem: Stem
    onStem: (s: Stem) => void
    onUpdate: (patch: Partial<Card>) => void
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
        { id: 'genre', label: 'Genre', Icon: TagIcon, body: <GenreTool card={card} onUpdate={props.onUpdate} /> },
        { id: 'write', label: 'Write Lyrics', Icon: PenIcon, body: <WriteTool key={card.id} card={card} onUpdate={props.onUpdate} /> },
        { id: 'sync', label: 'Sync Lyrics', Icon: ClockIcon, body: <SyncTool key={card.id + (card.lyrics?.length ?? 0)} {...props} /> },
    ]

    return (
        <aside className="fixed inset-y-0 right-0 z-20 w-[min(92vw,360px)] animate-[studio-in_0.4s_cubic-bezier(0.3,1,0.3,1)] overflow-y-auto border-l border-white/10 bg-[#0d0d0d] p-3 text-white">
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
