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
        let cancelled = false
        api.getEpisodeDetail(showId, ep.season, ep.episode).then((text) => {
            if(!cancelled) setDescription(text)
        })
        return () => { cancelled = true }
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
                    {description === null
                        ? 'Loading…'
                        : description || 'No description available on mobile yet.'}
                </p>
                <button type="button" className={styles.secondaryButton} style={{ width: '100%' }} onClick={onClose}>
                    Close
                </button>
            </div>
        </div>
    )
}

function EpisodeButton({ ep, showId, seasonNum, onToggleEpisode, isTracked = true }: {
    ep: Episode
    showId: string
    seasonNum: number
    onToggleEpisode: (showId: string, season: number, episode: number) => void
    isTracked?: boolean
}) {
    const [loading, setLoading] = useState(false)
    const [modalOpen, setModalOpen] = useState(false)
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const didLongPress = useRef(false)

    const startLongPress = useCallback(() => {
        didLongPress.current = false
        longPressTimer.current = setTimeout(() => {
            didLongPress.current = true
            setModalOpen(true)
        }, 500)
    }, [])

    const cancelLongPress = useCallback(() => {
        if(longPressTimer.current) clearTimeout(longPressTimer.current)
    }, [])

    const handleClick = async () => {
        if(didLongPress.current) return   // long-press consumed the interaction
        if(!isTracked || loading) return
        setLoading(true)
        try {
            await onToggleEpisode(showId, seasonNum, ep.episode)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            {modalOpen && <EpisodeDescriptionModal ep={ep} showId={showId} onClose={() => setModalOpen(false)} />}
            <button
                type="button"
                className={`${styles.episodeButton} ${ep.watched ? styles.episodeWatched : ''} ${!isTracked ? styles.episodeDisabled : ''}`}
                onClick={handleClick}
                onMouseDown={startLongPress}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onTouchStart={startLongPress}
                // onTouchEnd={cancelLongPress}
                // onTouchCancel={cancelLongPress}
                title={`${ep.title} — hold to see description`}
                disabled={loading}
            >
                <span className={styles.episodeNumber}>E{ep.episode}</span>
                <span className={styles.episodeTitle}>{loading ? 'Updating…' : ep.title}</span>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                    {ep?.airDate}
                </span>
            </button>
        </>
    )
}

export default function ShowSeasons({ showId, seasons, onToggleEpisode, onRefetch, onOptimisticUpdate, isTracked = true }: ShowSeasonsProps) {
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
                            />
                        ))}
                    </div>
                </details>
            ))}
        </div>
    )
}