import { useState } from 'react'
import type { Season, TvShow } from '../../services/api'
import SeasonHeader from './SeasonHeader'
import styles from '../../App.module.css'

type ShowSeasonsProps = {
    showId: string
    seasons: Season[]
    onToggleEpisode: (showId: string, season: number, episode: number) => void
    onRefetch?: () => Promise<TvShow | null>
    onOptimisticUpdate: (seasonNum: number, episodeNums: number[], watched: boolean) => void
}

type EpisodeButtonProps = {
    ep: import('../../services/api').Episode
    showId: string
    seasonNum: number
    onToggleEpisode: (showId: string, season: number, episode: number) => void
    onRefetch?: () => Promise<TvShow | null>
}

function EpisodeButton({ ep, showId, seasonNum, onToggleEpisode, onRefetch }: EpisodeButtonProps) {
    const [loading, setLoading] = useState(false)

    return (
        <button
            key={ep.id}
            type="button"
            className={`${styles.episodeButton} ${ep.watched ? styles.episodeWatched : ''}`}
            onClick={async () => {
                if(loading) return
                setLoading(true)
                try {
                    await onToggleEpisode(showId, seasonNum, ep.episode)
                    await onRefetch?.()
                } finally {
                    setLoading(false)
                }
            }}
            title={ep.title}
            disabled={loading}
        >
            <span className={styles.episodeNumber}>E{ep.episode}</span>
            <span className={styles.episodeTitle}>{loading ? 'Updating…' : ep.title}</span>
        </button>
    )
}

export default function ShowSeasons({ showId, seasons, onToggleEpisode, onRefetch, onOptimisticUpdate }: ShowSeasonsProps) {
    return (
        <div className={styles.seasonsContainer}>
            {seasons.map((season) => (
                <section key={season.season} className={styles.seasonSection}>
                    <SeasonHeader season={season} showId={showId} onRefetch={onRefetch} onOptimisticUpdate={onOptimisticUpdate} />
                    <div className={styles.episodeGrid}>
                        {season.episodes.map((ep) => (
                            <EpisodeButton
                                key={ep.id}
                                ep={ep}
                                showId={showId}
                                seasonNum={season.season}
                                onToggleEpisode={onToggleEpisode}
                                onRefetch={onRefetch}
                            />
                        ))}
                    </div>
                </section>
            ))}
        </div>
    )
}
