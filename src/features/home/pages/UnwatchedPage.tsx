import { useNavigate } from 'react-router-dom'
import type { TvShow } from "../../../services/apiTypes"
import ShowCard from '../../show/components/ShowCard'
import styles from '../../../App.module.css'
import useShows from '../hooks/useShows'

export default function UnwatchedPage() {
	const navigate = useNavigate()
	const { shows, loading } = useShows('unwatched')

	function handleShowClick(show: TvShow) {
		navigate(`/show/${encodeURIComponent(show.id)}`)
	}

	if(loading) {
		return (
			<main className={styles.mainPanel}>
				<div className={styles.emptyState}>Loading your show tracking data...</div>
			</main>
		)
	}

	if(shows.length === 0) {
		return (
			<main className={styles.mainPanel}>
				<div className={styles.emptyState}>No unwatched episodes found. Add more shows to follow.</div>
			</main>
		)
	}

	return (
		<main className={styles.mainPanel}>
			<section className={styles.tabContent}>
				<div className={styles.showGrid}>
					{shows.map((show) => (
						<ShowCard
							key={show.id}
							show={show}
							onClick={handleShowClick}
							action={
								<div className={styles.showCardMeta}>
									<span className={`${styles.badge} ${styles.badgeNext}`}>▶ S{show.nextUserEpisode?.season} E{show.nextUserEpisode?.episode} {show.nextUserEpisode?.title}</span>
								</div>
							}
						/>
					))}
				</div>
			</section>
		</main>
	)
}
