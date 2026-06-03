import { useNavigate } from 'react-router-dom'
import type { TvShow } from '../../../services/api'
import ShowCard from '../../show/components/ShowCard'
import styles from '../../../App.module.css'
import useShows from '../hooks/useShows'
import { getReleaseCountdown } from '../../show/utils/show'

export default function UpcomingPage() {
	const navigate = useNavigate()
	const { shows, loading } = useShows('upcoming')

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
				<div className={styles.emptyState}>No upcoming releases yet. Add shows to track future episodes.</div>
			</main>
		)
	}

	return (
		<main className={styles.mainPanel}>
			<section className={styles.tabContent}>
				<ol className={styles.timelineList}>
					{shows.map((show) => (
						<li key={show.id} className={styles.timelineItem}>
							<ShowCard
								show={show}
								onClick={handleShowClick}
								action={<div className={styles.showCardMeta}><span>{getReleaseCountdown(show)}</span></div>}
							/>
						</li>
					))}
				</ol>
			</section>
		</main>
	)
}
