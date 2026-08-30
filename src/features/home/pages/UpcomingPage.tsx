import { useState, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import type { TvShow } from "../../../services/apiTypes"
import styles from '../../../App.module.css'
import useShows from '../hooks/useShows'
import { getReleaseCountdown } from '../../show/utils/show'
import FilterButton from '../../../components/common/FilterButton'
import { useAppContext } from '../../../state/AppContext'
import useGenreFilter from '../../../hooks/useGenreFilter'
import GenreSelect from '../../../components/common/GenreSelect'

type UpcomingFilter = 'continue' | 'all'
type ViewMode = 'list' | 'calendar'

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

    return (
        <Link
            to={`/show/${encodeURIComponent(show.id)}`}
            className={styles.upcomingCard}
            onClick={(e) => {
                if(!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && e.button === 0) {
                    e.preventDefault();
                    onClick(show);
                }
            }}
        >
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
                        {displayReleaseDate}
                    </span>
                )}
            </div>
            <div className={`${styles.upcomingCountdown} ${isToday ? styles.upcomingCountdownToday : ''}`}>
                {isToday ? '🟣 Today' : countdown}
            </div>
        </Link>
    )
}

export default function UpcomingPage() {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const { shows, loading } = useShows('upcoming')
    const { settings } = useAppContext()
    const defaultView = settings?.defaultUpcomingView ?? 'list'
    const [viewMode, setViewMode] = useState<ViewMode>(defaultView)
    const [prevDefaultView, setPrevDefaultView] = useState(defaultView)
    const [genre, setGenre] = useState('')

    if (defaultView !== prevDefaultView) {
        setPrevDefaultView(defaultView)
        setViewMode(defaultView)
    }

    const filter = (searchParams.get('filter') as UpcomingFilter | null) ?? 'continue'

    const filteredShows = useMemo(() => {
        if(filter === 'continue') {
            return shows.filter((s) => (s.episodesWatched ?? 0) > 0)
        }
        return shows
    }, [shows, filter])
	const { genres, counts, loading: genresLoading, filter: filterByGenre } = useGenreFilter(filteredShows)
	const visibleShows = filterByGenre('', genre)

    const calendarGroups = useMemo(() => {
        const groups: Record<string, TvShow[]> = {}
        for (const show of visibleShows) {
            if (!show.nextAiringEpisode?.releaseDate) continue
            const date = new Date(show.nextAiringEpisode.releaseDate)
            const dateKey = date.toLocaleDateString('en-UK', { weekday: 'long', month: 'long', day: 'numeric' })
            if (!groups[dateKey]) groups[dateKey] = []
            groups[dateKey].push(show)
        }
        return Object.entries(groups)
    }, [visibleShows])

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
						<GenreSelect genres={genres} counts={counts} loading={genresLoading} value={genre} onChange={setGenre} />
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                            className={`${styles.secondaryButton} ${viewMode === 'list' ? styles.primaryButton : ''}`}
                            onClick={() => setViewMode('list')}
                            type="button"
                            style={{ padding: '6px 12px', minHeight: '34px', fontSize: '0.82rem' }}
                        >
                            List
                        </button>
                        <button
                            className={`${styles.secondaryButton} ${viewMode === 'calendar' ? styles.primaryButton : ''}`}
                            onClick={() => setViewMode('calendar')}
                            type="button"
                            style={{ padding: '6px 12px', minHeight: '34px', fontSize: '0.82rem' }}
                        >
                            📅 Calendar
                        </button>
                    </div>
                </div>

                {visibleShows.length === 0 ? (
                    <div className={styles.emptyState}>
                        {filter === 'continue'
                            ? 'No upcoming episodes for shows you\'re watching. Switch to All to see everything.'
                            : 'No upcoming releases yet. Add shows to track future episodes.'}
                    </div>
                ) : viewMode === 'list' ? (
                    <div className={styles.upcomingGrid}>
                        {visibleShows.map((show) => (
                            <UpcomingCard
                                key={show.id}
                                show={show}
                                onClick={(s) => navigate(`/show/${encodeURIComponent(s.id)}`)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className={styles.calendarContainer}>
                        {calendarGroups.map(([dateTitle, dateShows]) => (
                            <div key={dateTitle} className={styles.calendarDateGroup}>
                                <div className={styles.calendarDateHeader}>
                                    <span>🗓️ {dateTitle}</span>
                                    <span className={styles.calendarCountBadge}>{dateShows.length} release{dateShows.length > 1 ? 's' : ''}</span>
                                </div>
                                <div className={styles.upcomingGrid}>
                                    {dateShows.map((show) => (
                                        <UpcomingCard
                                            key={show.id}
                                            show={show}
                                            onClick={(s) => navigate(`/show/${encodeURIComponent(s.id)}`)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </main>
    )
}
