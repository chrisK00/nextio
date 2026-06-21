import { useNavigate } from 'react-router-dom'
import type { TvShow } from "../../../services/apiTypes"
import styles from '../../../App.module.css'
import useShows from '../hooks/useShows'
import { getReleaseCountdown } from '../../show/utils/show'

function UpcomingItem({ show, onClick }: { show: TvShow; onClick: (show: TvShow) => void }) {
	const countdown = getReleaseCountdown(show)
	const isToday = countdown === 'Today'

	const nextEpisodeDateString = show.nextAiringEpisode?.releaseDate ? new Date(show.nextAiringEpisode.releaseDate)
		.toLocaleDateString([], {
			dateStyle: 'medium'
		})
		: null;

	return (
		<button type="button" className={styles.upcomingItemButton} onClick={() => onClick(show)}>
			<div className={styles.upcomingPoster}>
				{show.posterUrl
					? <img src={show.posterUrl} alt={show.title} className={styles.showCardImage} />
					: <div className={styles.upcomingPosterPlaceholder} />}
			</div>
			<div className={styles.upcomingInfo}>
				<strong className={styles.upcomingTitle}>{show.title}</strong>
				<strong>S{show.nextAiringEpisode?.season} E{show.nextAiringEpisode?.episode}</strong>
				<span>{show.nextAiringEpisode?.title}</span>
				<span className={styles.upcomingNetwork}>{nextEpisodeDateString}</span>
			</div>
			<div className={`${styles.upcomingCountdown} ${isToday ? styles.upcomingCountdownToday : ''}`}>
				{isToday ? '🟣 Today' : countdown}
			</div>
		</button>
	)
}

export default function UpcomingPage() {
	const navigate = useNavigate()
	const { shows, loading } = useShows('upcoming')

	if(loading) {
		return <main className={styles.mainPanel}><div className={styles.emptyState}>Loading...</div></main>
	}

	if(shows.length === 0) {
		return <main className={styles.mainPanel}><div className={styles.emptyState}>No upcoming releases yet. Add shows to track future episodes.</div></main>
	}

	return (
		<main className={styles.mainPanel}>
			<ol className={styles.upcomingList}>
				{shows.map((show) => (
					<li key={show.id}>
						<UpcomingItem show={show} onClick={(s) => navigate(`/show/${encodeURIComponent(s.id)}`)} />
					</li>
				))}
			</ol>
		</main>
	)
}
