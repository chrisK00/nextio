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
    isTracked?: boolean
}

/**
 * BOTTOM SHEET (replaces modal)
 */
function EpisodeBottomSheet({
    ep,
    showId,
    onClose
}: {
    ep: Episode
    showId: string
    onClose: () => void
}) {
    const [description, setDescription] = useState<string | null>(null)

    useEffect(() => {
        let alive = true

        api.getEpisodeDetail(showId, ep.season, ep.episode)
            .then((text) => {
                if(alive) setDescription(text || 'No description available.')
            })
            .catch((err) => {
                if(alive) setDescription(`Connection Error: ${String(err)}`)
            })

        return () => {
            alive = false
        }
    }, [showId, ep.season, ep.episode])

    return (
        <>
            {/* backdrop */}
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    zIndex: 999
                }}
                onClick={onClose}
            />

            {/* bottom sheet */}
            <div
                style={{
                    position: 'fixed',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 1000,
                    background: '#1e1e1e',
                    borderTopLeftRadius: '14px',
                    borderTopRightRadius: '14px',
                    padding: '14px 14px 20px',
                    maxHeight: '70vh',
                    overflowY: 'auto',
                    boxShadow: '0 -10px 30px rgba(0,0,0,0.4)'
                }}
            >
                <strong>{ep.title}</strong>

                <p style={{ opacity: 0.7, fontSize: '0.85rem' }}>
                    S{ep.season} E{ep.episode}
                    {ep.airDate ? ` · ${new Date(ep.airDate).toLocaleDateString()}` : ''}
                </p>

                <p style={{ marginTop: 10, fontSize: '0.95rem', lineHeight: 1.4 }}>
                    {description === null ? 'Loading…' : description}
                </p>

                <button
                    type="button"
                    className={styles.secondaryButton}
                    style={{ width: '100%', marginTop: 12 }}
                    onClick={onClose}
                >
                    Close
                </button>
            </div>
        </>
    )
}

function EpisodeButton({
    ep,
    showId,
    seasonNum,
    onToggleEpisode,
    isTracked = true,
    onLongPress
}: {
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
            onMouseDown={startPress}
            onMouseUp={cancelPress}
            onMouseLeave={cancelPress}
            onTouchStart={startPress}
            onTouchEnd={cancelPress}
            onTouchCancel={cancelPress}
            onContextMenu={(e) => {
                e.preventDefault()
                wasLongPress.current = true
                onLongPress(ep)
            }}
            title={`${ep.title} — hold to see description`}
            disabled={loading}
        >
            <span className={styles.episodeNumber}>E{ep.episode}</span>
            <span className={styles.episodeTitle}>
                {loading ? 'Updating…' : ep.title}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                {ep?.airDate}
            </span>
        </button>
    )
}

export default function ShowSeasons({
    showId,
    seasons,
    onToggleEpisode,
    onRefetch,
    onOptimisticUpdate,
    isTracked = true
}: ShowSeasonsProps) {

    const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null)

    return (
        <div className={styles.seasonsContainer}>

            {activeEpisode && (
                <EpisodeBottomSheet
                    ep={activeEpisode}
                    showId={showId}
                    onClose={() => setActiveEpisode(null)}
                />
            )}

            {seasons.map((season) => (
                <details
                    key={season.season}
                    open={!season.episodes.every(ep => ep.watched)}
                    className={styles.seasonSection}
                >
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
                                onLongPress={(episode) => setActiveEpisode(episode)}
                            />
                        ))}
                    </div>
                </details>
            ))}
        </div>
    )
}