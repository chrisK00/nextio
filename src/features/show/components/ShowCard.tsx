import type { ReactNode } from 'react'
import type { TvShow } from "../../../services/apiTypes"
import styles from '../../../App.module.css'

type ShowCardProps = {
    show: TvShow
    action?: ReactNode
    onClick?: (show: TvShow) => void
    compact?: boolean
    showReleaseDate?: boolean
}

export default function ShowCard({ show, action, onClick, compact = false, showReleaseDate = false }: ShowCardProps) {
    const releaseDateString = show.releaseDate ? new Date(show.releaseDate).getFullYear() : null;
    if(!onClick) {
        return (
            <div className={styles.showCardButton}>
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
                        <strong className={styles.showCardTitle}>{show.title} {showReleaseDate && releaseDateString ? `(${releaseDateString})` : null} </strong>
                    </div>
                    {!compact && (<span>
                        {show.nextUserEpisode?.title}
                    </span>)}

                    {typeof (action) !== 'undefined' ? action : null}
                </article>
            </div>
        )
    }

    return (
        <div
            className={styles.showCardButton}
            role="button"
            tabIndex={0}
            onClick={() => onClick?.(show)}
            onKeyDown={(event) => {
                if(event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onClick?.(show)
                }
            }}
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
                    <strong className={styles.showCardTitle}>{show.title} {showReleaseDate && releaseDateString ? `(${releaseDateString})` : null} </strong>
                </div>
                {!compact && (<span>
                    {show.nextUserEpisode?.title}
                </span>)}

                    {typeof (action) !== 'undefined' ? action : null}
                </article>
        </div>
    )
}
