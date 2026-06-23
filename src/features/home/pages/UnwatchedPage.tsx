import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { TvShow } from "../../../services/apiTypes"
import ShowCard from '../../show/components/ShowCard'
import styles from '../../../App.module.css'
import useShows from '../hooks/useShows'
import FilterButton from '../../../components/common/FilterButton'

type UnwatchedFilter = 'continue' | 'all' | 'notStarted'

const unwatchedFilters: Array<{ key: UnwatchedFilter; label: string; tooltip: string }> = [
	{ key: 'continue', label: 'Continue', tooltip: 'Shows you\'ve already started watching at least 1 episode.' },
	{ key: 'all', label: 'All', tooltip: 'Every show that you have available unwatched episodes.' },
	{ key: 'notStarted', label: 'Not started', tooltip: 'Shows you\'ve added to your library but haven\'t watched a single episode of yet.' },
]

function getEmptyState(filter: UnwatchedFilter) {
	switch(filter) {
		case 'continue':
			return 'No continuing shows right now.'
		case 'all':
			return 'No unwatched episodes found. Add more shows to follow.'
		case 'notStarted':
			return 'No not started shows yet.'
	}
}

export default function UnwatchedPage() {
	const navigate = useNavigate()
	const [searchParams, setSearchParams] = useSearchParams()
	const { shows, loading } = useShows('unwatched')
	const filter = (searchParams.get('filter') as UnwatchedFilter | null) ?? 'continue'

	const filteredShows = useMemo(() => {
		return shows.filter((show) => {
			switch(filter) {
				case 'continue':
					return show.episodesWatched > 0
				case 'notStarted':
					return show.episodesWatched === 0
				case 'all':
					return true
			}
		})
	}, [shows, filter])

	function handleShowClick(show: TvShow) {
		navigate(`/show/${encodeURIComponent(show.id)}`)
	}

	function setFilter(nextFilter: UnwatchedFilter) {
		const params = new URLSearchParams(searchParams)
		if(nextFilter === 'continue') {
			params.delete('filter')
		} else {
			params.set('filter', nextFilter)
		}
		setSearchParams(params)
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
						{unwatchedFilters.map((item) => (
							<FilterButton
								key={item.key}
								label={item.label}
								active={filter === item.key}
								tooltip={item.tooltip}
								onClick={() => setFilter(item.key)}
							/>
						))}
					</div>
				</div>
				{filteredShows.length === 0 ? (
					<div className={styles.emptyState}>{getEmptyState(filter)}</div>
				) : (
					<div className={styles.unwatchedGrid}>
						{filteredShows.map((show) => (
							<ShowCard
								key={show.id}
								show={show}
								onClick={handleShowClick}
								hideEpisodeTitle
								action={
									<div className={styles.unwatchedCardFooter}>
										<span className={styles.unwatchedEpTitle}>
											{show.nextUserEpisode?.title &&
												(show.nextUserEpisode.title.length > 22
													? `${show.nextUserEpisode.title.slice(0, 22)}...`
													: show.nextUserEpisode.title)}
										</span>
										<span className={`${styles.badge} ${styles.badgeNext}`}>▶ S{show.nextUserEpisode?.season} E{show.nextUserEpisode?.episode}</span>
									</div>
								}
							/>
						))}
					</div>
				)}
			</section>
		</main>
	)
}
