import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { TvShow } from '../../../services/api'
import ShowCard from '../../show/components/ShowCard'
import styles from '../../../App.module.css'
import useShows from '../hooks/useShows'
import { isRunningShow } from '../../show/utils/show'

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

export default function WatchingPage() {
	const navigate = useNavigate()
	const { shows, loading } = useShows('watching')
	const [watchingSort, setWatchingSort] = useState<WatchingSort>('showStatus')

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
				<div className={styles.emptyState}>No followed shows yet. Use search to add your next series.</div>
			</main>
		)
	}

	const sortedWatching = sortWatchingShows(shows, watchingSort)
	const runningShows = sortedWatching.filter(isRunningShow)
	const unplannedShows = sortedWatching.filter((show) => !isRunningShow(show))
	const hasUnwatchedShows = sortedWatching.filter((show) => show.nextEpisodeTitle !== 'Up to date')
	const fullyWatchedShows = sortedWatching.filter((show) => show.nextEpisodeTitle === 'Up to date')

	return (
		<main className={styles.mainPanel}>
			<section className={styles.tabContent}>
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
												onClick={handleShowClick}
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
												onClick={handleShowClick}
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
												onClick={handleShowClick}
												compact
											/>
										))}
									</div>
								</section>
							)}
							{/* if we have fullywatchedshows we can show them in a separate section at the bottom, but only if the user has at least one show with unwatched episodes */}
							{fullyWatchedShows.length > 0 && (
								<section>
									<h2>Fully watched</h2>
									<div className={styles.showGridCompact}>
										{fullyWatchedShows.map((show) => (
											<ShowCard
												key={show.id}
												show={show}
												onClick={handleShowClick}
												compact
											/>
										))}
									</div>
								</section>
							)}
						</>
					)}
				</div>
			</section>
		</main>
	)
}
