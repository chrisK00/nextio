import { useState } from 'react'
import type { TvShow } from "../../../services/apiTypes"
import styles from '../../../App.module.css'
import ShowSeasons from './ShowSeasons'

type ShowDetailPanelProps = {
	show: TvShow | null
	isLoading: boolean
	onBack: () => void
	onToggleEpisode: (showId: string, season: number, episode: number) => void
	onFollowToggle: (show: TvShow, tracked: boolean) => void
	onToggleMovieWatched?: (show: TvShow, watched: boolean) => void
	isMovieWatched?: boolean
	isTracked: boolean
	onRefetch?: () => Promise<TvShow | null>
}

export default function ShowDetailPanel({ show, isLoading, onBack, onToggleEpisode, onFollowToggle, onToggleMovieWatched, isMovieWatched = false, isTracked, onRefetch }: ShowDetailPanelProps) {
	const [localShow, setLocalShow] = useState<TvShow | null>(show)
	const displayShow = localShow ?? show
	const maxDescriptionLength = 40;

	const [isDescriptionExpanded, setDescriptionExpanded] = useState(false);
	const description = show?.description || '';

	const nextEpisodeDateString = displayShow?.nextAiringEpisode?.releaseDate ? new Date(displayShow?.nextAiringEpisode?.releaseDate)
		.toLocaleString([], {
			dateStyle: 'medium',
			timeStyle: 'short'
		})
		: null;

	function recomputeCounts(s: TvShow) {
		const watched = (s.seasons ?? []).reduce((acc, season) => acc + season.episodes.filter((ep) => ep.watched).length, 0)
		return { ...s, episodesWatched: watched }
	}

	const handleToggleEpisode = async (showId: string, seasonNum: number, episodeNum: number) => {
		// Guard: episodes cannot be marked on a show the user isn't following.
		if(!isTracked) return

		setLocalShow((prev) => {
			if(!prev) return prev
			const copy: TvShow = JSON.parse(JSON.stringify(prev))
			const season = copy.seasons?.find((s) => s.season === seasonNum)
			if(!season) return prev
			const ep = season.episodes.find((e) => e.episode === episodeNum)
			if(!ep) return prev
			ep.watched = !ep.watched
			return recomputeCounts(copy)
		})

		try {
			await onToggleEpisode(showId, seasonNum, episodeNum)
		} catch {
			const fresh = await onRefetch?.()
			if(fresh) setLocalShow(fresh)
		}
	}

	const handleOptimisticSeasonUpdate = (seasonNum: number, episodeNums: number[], watched: boolean) => {
		setLocalShow((prev) => {
			if(!prev) return prev
			const copy: TvShow = JSON.parse(JSON.stringify(prev))
			const season = copy.seasons?.find((s) => s.season === seasonNum)
			if(!season) return prev
			season.episodes.forEach((ep) => {
				if(episodeNums.includes(ep.episode)) ep.watched = watched
			})
			return recomputeCounts(copy)
		})
	}
	if(isLoading && !displayShow) {
		return (
			<main className={styles.detailPanel}>
				<div className={styles.detailHeader}>
					<button className={styles.secondaryButton} onClick={onBack} type="button">
						← Back
					</button>
				</div>
				<div className={styles.emptyState}>Loading show details...</div>
			</main>
		)
	}

	if(!displayShow && !isLoading) {
		return (
			<main className={styles.detailPanel}>
				<div className={styles.detailHeader}>
					<button className={styles.secondaryButton} onClick={onBack} type="button">
						← Back
					</button>
				</div>
			</main>
		)
	}

	return (
		<main className={styles.detailPanel}>
			{isLoading && <div className={styles.loadingBar} />}
			<div className={styles.detailHeader}>
				<div className={styles.detailHeaderActions}>
					<button className={styles.secondaryButton} onClick={onBack} type="button">
						← Back
					</button>
					{displayShow?.mediaType === 'movie' && isTracked && onToggleMovieWatched && (
						<button
							className={styles.secondaryButton}
							onClick={() => show && onToggleMovieWatched(show, !isMovieWatched)}
							type="button"
						>
							{isMovieWatched ? 'Mark unwatched' : 'Mark watched'}
						</button>
					)}
					<button
						className={styles.secondaryButton}
						onClick={() => show && onFollowToggle(show, isTracked)}
						type="button"
					>
						{isTracked ? 'Unfollow' : 'Add'}
					</button>
				</div>
				<div className={styles.detailHeaderMain}>
					{show?.posterUrl && (
						<div className={styles.detailThumbnail}>
							<img src={show.posterUrl} alt={`${show.title} poster`} />
						</div>
					)}
					<div>
						<h2>{show?.title}</h2>
						<div className={styles.showMeta}>
							{nextEpisodeDateString && <span>Upcoming Episode: {nextEpisodeDateString}</span>}
						</div>
						<div>
							<span>Status: {show?.status}</span>
						</div>
						<div>
							<span>({show?.releaseDate ? new Date(show!.releaseDate!).getFullYear() : null})</span>
						</div>
					</div>
				</div>
			</div>

			<p className={styles.showDescription}>
				{isDescriptionExpanded || description.length <= maxDescriptionLength ? description : `${description.slice(0, maxDescriptionLength)}... `}
				{description.length > maxDescriptionLength && (
					<button onClick={() => setDescriptionExpanded(!isDescriptionExpanded)} style={{ border: 'none', background: 'none', color: '#0070f3', cursor: 'pointer', fontWeight: 'bold' }}>
						{isDescriptionExpanded ? 'Less' : 'More'}
					</button>
				)}
			</p>

			{displayShow?.mediaType !== 'movie' && displayShow?.seasons && displayShow.seasons.length > 0 && (
				<ShowSeasons
					showId={displayShow.id}
					seasons={displayShow.seasons}
					onToggleEpisode={handleToggleEpisode}
					onRefetch={onRefetch}
					onOptimisticUpdate={handleOptimisticSeasonUpdate}
					isTracked={isTracked}
				/>
			)}
		</main>
	)
}
