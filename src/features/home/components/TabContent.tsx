import { useState } from 'react'
import type { TvShow } from '../../../services/api'
import type { TabKey } from '../../../types'
import ShowCard from '../../show/components/ShowCard'
import styles from '../../../App.module.css'
import useWatching from '../hooks/useWatching'
import { getReleaseCountdown, isRunningShow } from '../../show/utils/show'

type TabContentProps = {
	activeTab: TabKey
	onShowClick?: (show: TvShow) => void
}

type WatchingSort = 'showStatus' | 'watchStatus'

const getWatchingTitle = (sort: WatchingSort) => {
	return sort === 'showStatus' ? 'Sort by show status' : 'Sort by my status'
}

const sortWatchingShows = (shows: TvShow[], sort: WatchingSort) => {
	return [...shows].sort((a, b) => {
		if(sort === 'watchStatus') {
			const aHasMore = a.episodesWatched < a.episodesTotal
			const bHasMore = b.episodesWatched < b.episodesTotal
			if(aHasMore !== bHasMore) return aHasMore ? -1 : 1
		}
		if(sort === 'showStatus') {
			const aRunning = isRunningShow(a)
			const bRunning = isRunningShow(b)
			if(aRunning !== bRunning) return aRunning ? -1 : 1
		}
		return a.title.localeCompare(b.title)
	})
}

export default function TabContent({ activeTab, onShowClick }: TabContentProps) {
	const { watching, unwatched, upcoming, loading } = useWatching()
	const [watchingSort, setWatchingSort] = useState<WatchingSort>('showStatus')

	if(loading) {
		return <div className={styles.emptyState}>Loading your show tracking data...</div>
	}

	if(activeTab === 'watching') {
		const sortedWatching = sortWatchingShows(watching, watchingSort)
		const runningShows = sortedWatching.filter(isRunningShow)
		const unplannedShows = sortedWatching.filter((show) => !isRunningShow(show))
		const hasUnwatchedShows = sortedWatching.filter((show) => show.episodesWatched < show.episodesTotal)
		const fullyWatchedShows = sortedWatching.filter((show) => show.episodesWatched >= show.episodesTotal)

		if(watching.length === 0) {
			return <div className={styles.emptyState}>No followed shows yet. Use search to add your next series.</div>
		}

		return (
			<div>
				<div className={styles.watchingToolbar}>
					<div>{getWatchingTitle(watchingSort)}</div>
					<div className={styles.sortControls}>
						<button
							type="button"
							className={`${styles.sortButton} ${watchingSort === 'showStatus' ? styles.sortButtonActive : ''}`}
							onClick={() => setWatchingSort('showStatus')}
						>
							Show status
						</button>
						<button
							type="button"
							className={`${styles.sortButton} ${watchingSort === 'watchStatus' ? styles.sortButtonActive : ''}`}
							onClick={() => setWatchingSort('watchStatus')}
						>
							My status
						</button>
					</div>
				</div>
				{watchingSort === 'showStatus' ? (
					<>
						{runningShows.length > 0 && (
							<section>
								<h2>Running TV Shows</h2>
								<div className={styles.showGridCompact}>
									{runningShows.map((show) => (
										<ShowCard
											key={show.id}
											show={show}
											onClick={onShowClick}
											compact
										/>
									))}
								</div>
							</section>
						)}
						{unplannedShows.length > 0 && (
							<section>
								<h2>Unplanned TV Shows</h2>
								<div className={styles.showGridCompact}>
									{unplannedShows.map((show) => (
										<ShowCard
											key={show.id}
											show={show}
											onClick={onShowClick}
											compact
										/>
									))}
								</div>
							</section>
						)}
					</>
				) : (
					<>
						{hasUnwatchedShows.length > 0 && (
							<section>
								<h2>Has unwatched episodes</h2>
								<div className={styles.showGridCompact}>
									{hasUnwatchedShows.map((show) => (
										<ShowCard
											key={show.id}
											show={show}
											onClick={onShowClick}
											compact
										/>
									))}
								</div>
							</section>
						)}
						{fullyWatchedShows.length > 0 && (
							<section>
								<h2>Fully watched</h2>
								<div className={styles.showGridCompact}>
									{fullyWatchedShows.map((show) => (
										<ShowCard
											key={show.id}
											show={show}
											onClick={onShowClick}
											compact
										/>
									))}
								</div>
							</section>
						)}
					</>
				)}
			</div>
		)
	}

	if(activeTab === 'unwatched') {
		if(unwatched.length === 0) {
			return <div className={styles.emptyState}>No unwatched episodes found. Add more shows to follow.</div>
		}

		return (
			<section>
				<div className={styles.showGrid}>
					{unwatched.map((show) => (
						<ShowCard
							key={show.id}
							show={show}
							onClick={onShowClick}
							action={
								<div className={styles.showCardMeta}>
									<span>{show.nextReleaseDate ? getReleaseCountdown(show) : show.nextEpisodeTitle || 'Unplanned'}</span>
								</div>
							}
						/>
					))}
				</div>
			</section>
		)
	}

	return (
		<section>
			<ol className={styles.timelineList}>
				{upcoming.map((show) => (
					<li key={show.id} className={styles.timelineItem}>
						<ShowCard
							show={show}
							onClick={onShowClick}
							action={<div className={styles.showCardMeta}><span>{getReleaseCountdown(show)}</span></div>}
						/>
					</li>
				))}
			</ol>
			{upcoming.length === 0 && (
				<div className={styles.emptyState}>No upcoming releases yet. Add shows to track future episodes.</div>
			)}
		</section>
	)
}
