import { useEffect, useState } from 'react'
import type { TvShow } from "../../../services/apiTypes"
import styles from '../../../App.module.css'
import ShowSeasons from './ShowSeasons'

type ShowDetailPanelProps = {
	show: TvShow | null
	isLoading: boolean
	onBack: () => void
	onToggleEpisode: (showId: string, season: number, episode: number) => void
	onFollowToggle: (show: TvShow, tracked: boolean) => void
	isTracked: boolean
	onRefetch?: () => Promise<TvShow | null>
}

export default function ShowDetailPanel({ show, isLoading, onBack, onToggleEpisode, onFollowToggle, isTracked, onRefetch }: ShowDetailPanelProps) {
	const [localShow, setLocalShow] = useState<TvShow | null>(show)

	// Keep localShow in sync with incoming show prop (e.g. after parent refetch)
	useEffect(() => {
		setLocalShow(show)
	}, [show])

	const displayShow = localShow ?? show

	function recomputeCounts(s: TvShow) {
		const watched = (s.seasons ?? []).reduce((acc, season) => acc + season.episodes.filter((ep) => ep.watched).length, 0)
		return { ...s, episodesWatched: watched }
	}

	const handleToggleEpisode = async (showId: string, seasonNum: number, episodeNum: number) => {
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
	if(isLoading) {
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

	if(!show) {
		return (
			<main className={styles.detailPanel}>
				<div className={styles.detailHeader}>
					<button className={styles.secondaryButton} onClick={onBack} type="button">
						← Back
					</button>
				</div>
				<div className={styles.emptyState}>Show not found</div>
			</main>
		)
	}

	return (
		<main className={styles.detailPanel}>
			<div className={styles.detailHeader}>
				<div className={styles.detailHeaderActions}>
					<button className={styles.secondaryButton} onClick={onBack} type="button">
						← Back
					</button>
					<button
						className={styles.secondaryButton}
						onClick={() => onFollowToggle(show, isTracked)}
						type="button"
					>
						{isTracked ? 'Unfollow' : 'Add'}
					</button>
				</div>
				<div className={styles.detailHeaderMain}>
					{show.posterUrl && (
						<div className={styles.detailThumbnail}>
							<img src={show.posterUrl} alt={`${show.title} poster`} />
						</div>
					)}
					<div>
						<h2>{show.title}</h2>
						<div className={styles.showMeta}>
							<span>{show.network}</span>
							<span>{show.status}</span>
						</div>
					</div>
				</div>
			</div>

			<p className={styles.showDescription}>{show.description}</p>

			{displayShow?.mediaType !== 'movie' && displayShow?.seasons && displayShow.seasons.length > 0 && (
				<ShowSeasons
					showId={displayShow.id}
					seasons={displayShow.seasons}
					onToggleEpisode={handleToggleEpisode}
					onRefetch={onRefetch}
					onOptimisticUpdate={handleOptimisticSeasonUpdate}
				/>
			)}
		</main>
	)
}
