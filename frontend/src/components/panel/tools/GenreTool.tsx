import type { Card } from '../../../types'

type GenreToolProps = {
    card: Card
    onUpdate: (patch: Partial<Card>) => void
}

const GENRES = ['Ambient', 'Electronic', 'Jazz', 'Hip-hop', 'Classical', 'Soul', 'Pop', 'Rock']
const btn = 'rounded-full px-4 py-2 text-[12px] font-medium transition-colors cursor-pointer'

export default function GenreTool({ card, onUpdate }: GenreToolProps) {
    return (
        <div className="flex flex-wrap gap-2">
            {GENRES.map((g) => (
                <button
                    key={g}
                    onClick={() => onUpdate({ genre: card.genre === g ? undefined : g })}
                    className={`${btn} border ${card.genre === g ? 'border-white bg-white text-neutral-900' : 'border-white/15 text-white/75 hover:border-white/40'}`}
                >
                    {g}
                </button>
            ))}
        </div>
    )
}
