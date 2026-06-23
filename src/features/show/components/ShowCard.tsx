import type { ReactNode } from 'react'
import type { TvShow } from "../../../services/apiTypes"
import styles from '../../../App.module.css'

type ShowCardProps = {
    show: TvShow
    action?: ReactNode
    onClick?: (show: TvShow) => void
    compact?: boolean
    showReleaseDate?: boolean
    /** Hide the next-episode title span (use when the card layout must be uniform height) */
    hideEpisodeTitle?: boolean
}

function CardInner({ show, action, compact, showReleaseDate, hideEpisodeTitle }: Omit<ShowCardProps, 'onClick'>) {
    const releaseDateString = show.releaseDate ? new Date(show.releaseDate).getFullYear() : null
    return (
        <article className={`${styles.showCard} ${compact ? styles.showCardCompact : ''}`}>
            <div className={compact ? styles.showCardImageWrapCompact : styles.showCardImageWrap}>
                {show.posterUrl ? (
                    <img src={show.posterUrl} alt={show.title} className={styles.showCardImage} />
                ) : (
                    <svg width="48" height="34" viewBox="0 0 48 34" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                        <rect width="48" height="34" rx="6" fill="#E6E6E6" />
                    </svg>
                )}
            </div>
            <div className={`${styles.showCardBody} ${compact ? styles.showCardBodyCompact : ''}`}>
                <strong className={styles.showCardTitle}>
                    {show.title}{showReleaseDate && releaseDateString ? ` (${releaseDateString})` : ''}
                </strong>
                {!compact && !hideEpisodeTitle && <span>{show.nextUserEpisode?.title}</span>}
                {action ?? null}
            </div>
        </article>
    )
}

export default function ShowCard({ show, action, onClick, compact = false, showReleaseDate = false, hideEpisodeTitle = false }: ShowCardProps) {
    if (!onClick) {
        return (
            <div className={styles.showCardButton}>
                <CardInner show={show} action={action} compact={compact} showReleaseDate={showReleaseDate} hideEpisodeTitle={hideEpisodeTitle} />
            </div>
        )
    }
    return (
        <div
            className={styles.showCardButton}
            role="button"
            tabIndex={0}
            onClick={() => onClick(show)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(show) } }}
        >
            <CardInner show={show} action={action} compact={compact} showReleaseDate={showReleaseDate} hideEpisodeTitle={hideEpisodeTitle} />
        </div>
    )
}
