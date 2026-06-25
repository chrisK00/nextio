import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { TvShow } from "../../../services/apiTypes"
import styles from '../../../App.module.css'
import useShows from '../hooks/useShows'
import { getReleaseCountdown } from '../../show/utils/show'
import FilterButton from '../../../components/common/FilterButton'

type UpcomingFilter = 'continue' | 'all'

const upcomingFilters: Array<{ key: UpcomingFilter; label: string; tooltip: string }> = [
    { key: 'continue', label: 'Continue', tooltip: 'Upcoming episodes only for shows you\'ve already started watching at least 1 episode.' },
    { key: 'all', label: 'All', tooltip: 'All tracked shows with a future episode date, including ones you haven\'t started yet.' },
]

function UpcomingCard({ show, onClick }: { show: TvShow; onClick: (show: TvShow) => void }) {
    const countdown = getReleaseCountdown(show)
    const isToday = countdown === 'Today'

    const currentYear = new Date().getFullYear();
    const airDate = new Date(show.nextAiringEpisode!.releaseDate);

    const displayReleaseDate = airDate.getFullYear() === currentYear
        ? airDate.toLocaleDateString('en-UK', { weekday: 'short', month: 'short', day: 'numeric' }) // "Thu, Jun 25"
        : airDate.toLocaleDateString('en-UK', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }); // "Sun, Jan 3, 2027"

    // const releaseDate = show.nextAiringEpisode?.releaseDate
    //     ? new Date(show.nextAiringEpisode.releaseDate).toDateString()
    //     : null

    // Show time only if it's not midnight (i.e. TMDb provided an actual time)
    // const hasTime = releaseDate && (releaseDate.getHours() !== 0 || releaseDate.getMinutes() !== 0)

    // const dateString = releaseDate
    //     ? releaseDate.toLocaleDateString([], { dateStyle: 'medium' })
    //     : null

    // const timeString = hasTime
    //     ? releaseDate!.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    //     : null

    return (
        <button type="button" className={styles.upcomingCard} onClick={() => onClick(show)}>
            <div className={styles.upcomingCardPoster}>
                {show.posterUrl
                    ? <img src={show.posterUrl} alt={show.title} className={styles.showCardImage} />
                    : <div className={styles.upcomingPosterPlaceholder} />}
            </div>
            <div className={styles.upcomingCardInfo}>
                <strong className={styles.upcomingTitle}>{show.title}</strong>
                <span>S{show.nextAiringEpisode?.season} E{show.nextAiringEpisode?.episode} · {show.nextAiringEpisode?.title}</span>
                {displayReleaseDate && (
                    <span className={styles.upcomingNetwork}>
                        {/* {releaseDate}{timeString ? ` at ${timeString}` : ''} */}
                        {displayReleaseDate}
                    </span>
                )}
            </div>
            <div className={`${styles.upcomingCountdown} ${isToday ? styles.upcomingCountdownToday : ''}`}>
                {isToday ? '🟣 Today' : countdown}
            </div>
        </button>
    )
}

export default function UpcomingPage() {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const { shows, loading } = useShows('upcoming')
    const filter = (searchParams.get('filter') as UpcomingFilter | null) ?? 'continue'

    const filteredShows = useMemo(() => {
        if(filter === 'continue') {
            // Only shows where the user has already started watching
            return shows.filter((s) => (s.episodesWatched ?? 0) > 0)
        }
        return shows
    }, [shows, filter])

    function setFilter(next: UpcomingFilter) {
        const params = new URLSearchParams(searchParams)
        if(next === 'continue') {
            params.delete('filter')
        } else {
            params.set('filter', next)
        }
        setSearchParams(params)
    }

    if(loading) {
        return <main className={styles.mainPanel}><div className={styles.loadingBar} /></main>
    }

    return (
        <main className={styles.mainPanel}>
            <section className={styles.tabContent}>
                <div className={styles.watchingToolbar}>
                    <div className={styles.sortControls}>
                        {upcomingFilters.map((f) => (
                            <FilterButton
                                key={f.key}
                                label={f.label}
                                active={filter === f.key}
                                tooltip={f.tooltip}
                                onClick={() => setFilter(f.key)}
                            />
                        ))}
                    </div>
                </div>

                {filteredShows.length === 0 ? (
                    <div className={styles.emptyState}>
                        {filter === 'continue'
                            ? 'No upcoming episodes for shows you\'re watching. Switch to All to see everything.'
                            : 'No upcoming releases yet. Add shows to track future episodes.'}
                    </div>
                ) : (
                    <div className={styles.upcomingGrid}>
                        {filteredShows.map((show) => (
                            <UpcomingCard
                                key={show.id}
                                show={show}
                                onClick={(s) => navigate(`/show/${encodeURIComponent(s.id)}`)}
                            />
                        ))}
                    </div>
                )}
            </section>
        </main>
    )
}
