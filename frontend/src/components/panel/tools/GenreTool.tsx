import type { Card } from '../../../types'
import Button from '../../ui/Button'
import { showSnackbar } from '../../../utils/snackbar'

type GenreToolProps = {
    card: Card
    onUpdate: (patch: Partial<Card>) => void
}

const GENRES = ['Ambient', 'Electronic', 'Jazz', 'Hip-hop', 'Classical', 'Soul', 'Pop', 'Rock']

export default function GenreTool({ card, onUpdate }: GenreToolProps) {
    const handleToggle = (g: string) => {
        const next = card.genre === g ? undefined : g
        onUpdate({ genre: next })
        showSnackbar(next ? `Genre set to ${next}` : 'Genre removed', 'success')
    }

    return (
        <div className="flex flex-wrap gap-2">
            {GENRES.map((g) => (
                <Button
                    key={g}
                    variant="chip"
                    size="md"
                    selected={card.genre === g}
                    onClick={() => handleToggle(g)}
                >
                    {g}
                </Button>
            ))}
        </div>
    )
}
