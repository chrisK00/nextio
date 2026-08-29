import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { TvShow } from "../../../services/apiTypes"
import ShowCard from '../../show/components/ShowCard'
import styles from '../../../App.module.css'
import useShows from '../hooks/useShows'
import { isRunningShow } from '../../show/utils/show'
import FilterButton from '../../../components/common/FilterButton'

type WatchingFilter = 'inProgress' | 'notStarted' | 'completed' | 'running' | 'unplanned' | 'all'

const watchingFilters: Array<{ key: WatchingFilter; label: string; tooltip: string }> = [
	{ key: 'inProgress', label: 'Continue', tooltip: 'Shows where you\'ve watched at least one episode and still have more to go.' },
	{ key: 'notStarted', label: 'Not started', tooltip: 'Shows you follow but haven\'t watched a single episode of yet.' },
	{ key: 'completed', label: 'Completed', tooltip: 'Shows where you\'ve watched all available episodes and there\'s no next episode queued.' },
	{ key: 'running', label: 'Running', tooltip: 'Currently airing shows — TMDb has a future episode date for these.' },
	{ key: 'unplanned', label: 'Unplanned', tooltip: 'Shows with no announced next air date (ended, cancelled, or hiatus).' },
	{ key: 'all', label: 'All', tooltip: 'Every show in your library regardless of status.' },
]

function isNotStarted(show: TvShow) {
	return show.episodesWatched === 0
}

function isInProgress(show: TvShow) {
	return show.episodesWatched > 0 && Boolean(show.nextUserEpisode)
}

function isCompleted(show: TvShow) {
	return show.episodesWatched > 0 && !show.nextUserEpisode
}

function matchesFilter(show: TvShow, filter: WatchingFilter) {
	switch(filter) {
		case 'inProgress':
			return isInProgress(show)
		case 'notStarted':
			return isNotStarted(show)
		case 'completed':
			return isCompleted(show)
		case 'running':
			return isRunningShow(show)
		case 'unplanned':
			return !isRunningShow(show)
		case 'all':
			return true
	}
}

function sortShows(shows: TvShow[], filter: WatchingFilter) {
	const byTitle = [...shows].sort((a, b) => a.title.localeCompare(b.title))

	switch(filter) {
		case 'running':
			return [...shows].sort((a, b) => {
				const aTime = a.nextAiringEpisode?.releaseDate ? new Date(a.nextAiringEpisode.releaseDate).getTime() : Number.MAX_SAFE_INTEGER
				const bTime = b.nextAiringEpisode?.releaseDate ? new Date(b.nextAiringEpisode.releaseDate).getTime() : Number.MAX_SAFE_INTEGER
				if(aTime !== bTime) return aTime - bTime
				return a.title.localeCompare(b.title)
			})
		case 'inProgress':
			return [...shows].sort((a, b) => {
				const aTime = a.nextUserEpisode?.releaseDate ? new Date(a.nextUserEpisode.releaseDate).getTime() : Number.MAX_SAFE_INTEGER
				const bTime = b.nextUserEpisode?.releaseDate ? new Date(b.nextUserEpisode.releaseDate).getTime() : Number.MAX_SAFE_INTEGER
				if(aTime !== bTime) return aTime - bTime
				return a.title.localeCompare(b.title)
			})
		case 'all':
			return byTitle
		default:
			return byTitle
	}
}

function getEmptyState(filter: WatchingFilter) {
	switch(filter) {
		case 'inProgress':
			return 'No shows in progress yet.'
		case 'notStarted':
			return 'No not started shows yet.'
		case 'completed':
			return 'No completed shows yet.'
		case 'running':
			return 'No running shows yet.'
		case 'unplanned':
			return 'No unplanned shows yet.'
		case 'all':
			return 'No followed shows yet. Use search to add your next series.'
	}
}

import { useState, useRef } from 'react'
import { CiSearch } from "react-icons/ci"

export default function WatchingPage() {
	const navigate = useNavigate()
	const [searchParams, setSearchParams] = useSearchParams()
	const { shows, loading } = useShows('watching')
	const watchingFilter = (searchParams.get('filter') as WatchingFilter | null) ?? 'running'
	const [libraryQuery, setLibraryQuery] = useState('')
	const searchInputRef = useRef<HTMLInputElement>(null)

	const filteredShows = useMemo(() => {
		const base = shows.filter((show) => matchesFilter(show, watchingFilter))
		const sorted = sortShows(base, watchingFilter)
		if (!libraryQuery.trim()) return sorted
		const q = libraryQuery.toLowerCase().trim()
		return sorted.filter((s) => s.title.toLowerCase().includes(q))
	}, [shows, watchingFilter, libraryQuery])

	function setWatchingFilter(filter: WatchingFilter) {
		const params = new URLSearchParams(searchParams)
		if(filter === 'running') {
			params.delete('filter')
		} else {
			params.set('filter', filter)
		}
		setSearchParams(params)
	}

	function handleShowClick(show: TvShow) {
		navigate(`/show/${encodeURIComponent(show.id)}`)
	}

	function focusSearch() {
		searchInputRef.current?.focus()
	}

	if(loading) {
		return (
			<main className={styles.mainPanel}>
				<div className={styles.loadingBar} />
			</main>
		)
	}

	return (
		<main className={styles.mainPanel}>
			<section className={styles.tabContent}>
				<div className={styles.watchingToolbar}>
					<div className={styles.sortControls}>
						{watchingFilters.map((filter) => (
							<FilterButton
								key={filter.key}
								label={filter.label}
								active={watchingFilter === filter.key}
								tooltip={filter.tooltip}
								onClick={() => setWatchingFilter(filter.key)}
							/>
						))}
					</div>
					<div className={styles.librarySearchWrap}>
						<button
							className={styles.secondaryButton}
							onClick={focusSearch}
							type="button"
							style={{ padding: '8px 12px', minHeight: '36px', display: 'flex', alignItems: 'center', gap: '4px' }}
							title="Focus Search"
						>
							<CiSearch size={18} />
						</button>
						<input
							ref={searchInputRef}
							type="text"
							value={libraryQuery}
							onChange={(e) => setLibraryQuery(e.target.value)}
							placeholder="Filter by show name..."
							className={styles.librarySearchInput}
						/>
						{libraryQuery && (
							<button
								onClick={() => setLibraryQuery('')}
								className={styles.librarySearchClear}
								type="button"
								title="Clear filter"
							>
								✕
							</button>
						)}
					</div>
				</div>

				{filteredShows.length === 0 ? (
					<div className={styles.emptyState}>
						{libraryQuery ? (
							<div>
								<p>No followed shows matching "{libraryQuery}" in this view.</p>
								<button
									className={styles.primaryButton}
									style={{ marginTop: '12px' }}
									onClick={() => navigate(`/search`)}
									type="button"
								>
									Search TMDb globally
								</button>
							</div>
						) : (
							getEmptyState(watchingFilter)
						)}
					</div>
				) : (
					<div className={styles.showGrid}>
						{filteredShows.map((show) => (
							<ShowCard
								key={show.id}
								show={show}
								onClick={handleShowClick}
								compact
							/>
						))}
					</div>
				)}
			</section>
		</main>
	)
}
