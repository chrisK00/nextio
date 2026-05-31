import type { TvShow } from '../services/api'
import type { TabKey } from '../types'
import ShowCard from './ShowCard'
import styles from '../App.module.css'
import useWatching from '../hooks/useWatching'

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
			<div className={styles.showGrid}>
				{watching.map((show) => (
					<ShowCard
						key={show.id}
						show={show}
						onClick={onShowClick}
						action={<div className={styles.showCardMeta}><span>{show.episodesWatched}/{show.episodesTotal} watched</span></div>}
					/>
				))}
				{watching.length === 0 && (
					<div className={styles.emptyState}>No active shows yet. Use search to add your next series.</div>
				)}
			</div>
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
		<div className={styles.showGrid}>
			{upcoming.map((show) => (
				<ShowCard
					key={show.id}
					show={show}
					onClick={onShowClick}
					action={<div className={styles.showCardMeta}><span>{show.nextReleaseDate ? new Date(show.nextReleaseDate).toLocaleDateString() : 'TBD'}</span></div>}
				/>
			))}
			{upcoming.length === 0 && (
				<div className={styles.emptyState}>No upcoming releases yet. Add shows to track future episodes.</div>
			)}
		</div>
	)
}
