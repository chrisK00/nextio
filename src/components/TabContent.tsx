import type { TvShow } from '../services/api'
import type { TabKey } from '../types'
import ShowCard from './ShowCard'
import styles from '../App.module.css'
import useWatching from '../hooks/useWatching'

function formatDaysUntilRelease(dateString?: string) {
	if(!dateString) {
		return null
	}

	const releaseDate = new Date(dateString)
	const today = new Date()
	const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
	const utcRelease = Date.UTC(releaseDate.getFullYear(), releaseDate.getMonth(), releaseDate.getDate())
	const days = Math.round((utcRelease - utcToday) / (1000 * 60 * 60 * 24))

	if(days <= 0) {
		return 'Releases today'
	}
	if(days === 1) {
		return 'Releases tomorrow'
	}

	return `Releases in ${days} days`
}

type TabContentProps = {
	activeTab: TabKey
	onShowClick?: (show: TvShow) => void
}

export default function TabContent({ activeTab, onShowClick }: TabContentProps) {
	const { watching, unwatched, upcoming, loading } = useWatching()

	if(loading) {
		return <div className={styles.emptyState}>Loading your show tracking data...</div>
	}

	if(activeTab === 'watching') {
		return (
			<ul className={styles.showList}>
				{watching.map((show) => (
					<button
						key={show.id}
						type="button"
						className={styles.showListButton}
						onClick={() => onShowClick?.(show)}
					>
						<div>
							<h3>{show.title}</h3>
							<p>{show.description}</p>
						</div>
						<div className={styles.showMeta}>
							<span>{show.network}</span>
							<span>{show.nextEpisode}</span>
							<span>{show.episodesWatched}/{show.episodesTotal} watched</span>
						</div>
					</button>
				))}
				{watching.length === 0 && (
					<div className={styles.emptyState}>No active shows yet. Use search to add your next series.</div>
				)}
			</ul>
		)
	}

	if(activeTab === 'unwatched') {
		return (
			<div className={styles.showGrid}>
				{unwatched.map((show) => (
					<ShowCard key={show.id} show={show} onClick={onShowClick} />
				))}
				{unwatched.length === 0 && (
					<div className={styles.emptyState}>No unwatched episodes found. Add more shows to follow.</div>
				)}
			</div>
		)
	}

	return (
		<div className={styles.timelineList}>
			{upcoming.map((show) => (
				<button
					key={show.id}
					type="button"
					className={styles.timelineCardButton}
					onClick={() => onShowClick?.(show)}
				>
					<section className={styles.timelineCard}>
						<div className={styles.timelineDate}>
							{show.nextReleaseDate ? new Date(show.nextReleaseDate).toLocaleDateString() : 'TBD'}
						</div>
						<div>
							<h3>{show.title}</h3>
							<p>{show.nextEpisode} · {show.nextEpisodeTitle}</p>
							<p>{show.network}</p>
							<p>{formatDaysUntilRelease(show.nextReleaseDate)}</p>
						</div>
					</section>
				</button>
			))}
			{upcoming.length === 0 && (
				<div className={styles.emptyState}>No upcoming releases yet. Add shows to track future episodes.</div>
			)}
		</div>
	)
}
