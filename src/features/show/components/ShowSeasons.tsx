import { useState } from 'react'
import type { TvShow, Season, Episode } from "../../../services/apiTypes"
import SeasonHeader from './SeasonHeader'
import styles from '../../../App.module.css'

type ShowSeasonsProps = {
    showId: string
    seasons: Season[]
    onToggleEpisode: (showId: string, season: number, episode: number) => void
    onRefetch?: () => Promise<TvShow | null>
    onOptimisticUpdate: (seasonNum: number, episodeNums: number[], watched: boolean) => void
}

function EpisodeButton({ ep, showId, seasonNum, onToggleEpisode }: {
    ep: Episode
    showId: string
    seasonNum: number
    onToggleEpisode: (showId: string, season: number, episode: number) => void
}) {
    const [loading, setLoading] = useState(false)

    return (
        <button
            type="button"
            className={`${styles.episodeButton} ${ep.watched ? styles.episodeWatched : ''}`}
            onClick={async () => {
                if(loading) return
                setLoading(true)
                try {
                    await onToggleEpisode(showId, seasonNum, ep.episode)
                } finally {
                    setLoading(false)
                }
            }}
            title={ep.title}
            disabled={loading}
        >
            <span className={styles.episodeNumber}>E{ep.episode}</span>
            <span className={styles.episodeTitle}>{loading ? 'Updating…' : ep.title}</span>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                {ep?.airDate}
            </span>
        </button>
    )
}

export default function ShowSeasons({ showId, seasons, onToggleEpisode, onRefetch, onOptimisticUpdate }: ShowSeasonsProps) {
    return (
        <div className={styles.seasonsContainer}>
            {seasons.map((season) => (
                <details key={season.season} open={!season.episodes.every(ep => ep.watched)} className={styles.seasonSection}>

                    <summary style={{ cursor: 'pointer', listStyle: 'none' }}>
                        <SeasonHeader
                            season={season}
                            showId={showId}
                            onRefetch={onRefetch}
                            onOptimisticUpdate={onOptimisticUpdate}
                        />
                    </summary>

                    <div className={styles.episodeGrid}>
                        {season.episodes.map((ep) => (
                            <EpisodeButton
                                key={ep.id}
                                ep={ep}
                                showId={showId}
                                seasonNum={season.season}
                                onToggleEpisode={onToggleEpisode}
                            />
                        ))}
                    </div>
                </details>
            ))}
        </div>
    )
}