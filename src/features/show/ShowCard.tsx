import type { ReactNode } from 'react'
import type { TvShow } from '../../services/api'
import styles from '../../App.module.css'

type ShowCardProps = {
    show: TvShow
    action?: ReactNode
    onClick?: (show: TvShow) => void
    compact?: boolean
}

export default function ShowCard({ show, action, onClick, compact = false }: ShowCardProps) {

    return (
        <button
            type="button"
            className={styles.showCardButton}
            onClick={() => onClick?.(show)}
        >
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
                    <strong className={styles.showCardTitle}>{show.title}</strong>
                    {!compact && <span className={styles.showCardNetwork}>{show.network}</span>}
                </div>
                {!compact && (
                    <div className={styles.showCardMeta}>
                        <span>{show.nextEpisode}</span>
                    </div>
                )}
                {!compact && typeof (action) !== 'undefined' ? action : null}
                {/* Add button removed: add action should live on the show detail page */}
            </article>
        </button>
    )
}
