import { useState, useRef, useCallback, useEffect } from 'react'
import * as api from '../../../services/api'
import type { TvShow, Season, Episode } from "../../../services/apiTypes"
import SeasonHeader from './SeasonHeader'
import styles from '../../../App.module.css'

type ShowSeasonsProps = {
    showId: string
    seasons: Season[]
    onToggleEpisode: (showId: string, season: number, episode: number) => void
    onRefetch?: () => Promise<TvShow | null>
    onOptimisticUpdate: (seasonNum: number, episodeNums: number[], watched: boolean) => void
    /** Prevents marking episodes on unfollowed shows. */
    isTracked?: boolean
}

/** Modal shown when user long-presses an episode button. Fetches description on demand. */
function EpisodeDescriptionModal({ ep, showId, onClose }: { ep: Episode; showId: string; onClose: () => void }) {
    const [description, setDescription] = useState<string | null>(null)

    useEffect(() => {
        let isCurrentRequest = true

        api.getEpisodeDetail(showId, ep.season, ep.episode)
            .then((text) => {
                if(isCurrentRequest) {
                    setDescription(text || 'No description available.')
                }
            })
            .catch((err) => {
                if(isCurrentRequest) {
                    setDescription(`Connection Error: ${String(err)}`)
                }
            })

        return () => {
            isCurrentRequest = false
        }
    }, [showId, ep.season, ep.episode])

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <strong>{ep.title}</strong>
                <p className={styles.modalEpisodeMeta}>
                    S{ep.season} E{ep.episode}
                    {ep.airDate ? ` · ${new Date(ep.airDate).toLocaleDateString()}` : ''}
                </p>
                <p className={styles.modalDescription}>
                    {description === null ? 'Loading…' : description}
                </p>
                <button type="button" className={styles.secondaryButton} style={{ width: '100%' }} onClick={onClose}>
                    Close
                </button>
            </div>
        </div>
    )
}

function EpisodeButton({ ep, showId, seasonNum, onToggleEpisode, isTracked = true, onLongPress }: {
    ep: Episode
    showId: string
    seasonNum: number
    onToggleEpisode: (showId: string, season: number, episode: number) => void
    isTracked?: boolean
    onLongPress: (episode: Episode) => void
}) {
    const [loading, setLoading] = useState(false)
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const wasLongPress = useRef(false)

    const startPress = useCallback(() => {
        wasLongPress.current = false
        longPressTimer.current = setTimeout(() => {
            wasLongPress.current = true
            onLongPress(ep)
        }, 500)
    }, [ep, onLongPress])

    const cancelPress = useCallback(() => {
        if(longPressTimer.current) {
            clearTimeout(longPressTimer.current)
            longPressTimer.current = null
        }
    }, [])

    const handleClick = async () => {
        if(wasLongPress.current) {
            wasLongPress.current = false
            return
        }
        if(!isTracked || loading) return
        setLoading(true)
        try {
            await onToggleEpisode(showId, seasonNum, ep.episode)
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            type="button"
            className={`${styles.episodeButton} ${ep.watched ? styles.episodeWatched : ''} ${!isTracked ? styles.episodeDisabled : ''}`}
            style={{
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
                userSelect: 'none'
            }}
            onClick={handleClick}
            // Mouse Hooks
            onMouseDown={startPress}
            onMouseUp={cancelPress}
            onMouseLeave={cancelPress}
            // Mobile Touch Hooks
            onTouchStart={startPress}
            onTouchEnd={cancelPress}
            onTouchCancel={cancelPress}
            // Context Menu Intercept (Stops Android System popups from hijacking the view)
            onContextMenu={(e) => {
                e.preventDefault()
                wasLongPress.current = true
                onLongPress(ep)
            }}
            title={`${ep.title} — hold to see description`}
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

export default function ShowSeasons({ showId, seasons, onToggleEpisode, onRefetch, onOptimisticUpdate, isTracked = true }: ShowSeasonsProps) {
    const [activeModalEpisode, setActiveModalEpisode] = useState<Episode | null>(null)

    return (
        <div className={styles.seasonsContainer}>
            {activeModalEpisode && (
                <EpisodeDescriptionModal
                    ep={activeModalEpisode}
                    showId={showId}
                    onClose={() => setActiveModalEpisode(null)}
                />
            )}

            {seasons.map((season) => (
                <details key={season.season} open={!season.episodes.every(ep => ep.watched)} className={styles.seasonSection}>
                    <summary style={{ cursor: 'pointer', listStyle: 'none' }}>
                        <SeasonHeader
                            season={season}
                            showId={showId}
                            onRefetch={onRefetch}
                            onOptimisticUpdate={onOptimisticUpdate}
                            isTracked={isTracked}
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
                                isTracked={isTracked}
                                onLongPress={(episode) => setActiveModalEpisode(episode)}
                            />
                        ))}
                    </div>
                </details>
            ))}
        </div>
    )
}