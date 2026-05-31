import type { TvShow } from '../services/api'
// api calls moved to SeasonHeader
import styles from '../App.module.css'
import { useState } from 'react'
import SeasonHeader from './SeasonHeader'

type ShowDetailPanelProps = {
	show: TvShow | null
	isLoading: boolean
	onBack: () => void
	onToggleEpisode: (showId: string, season: number, episode: number) => void
	onAdd: (show: TvShow) => void
	onRefetch?: () => Promise<TvShow | null>
}

// season header lives in src/components/SeasonHeader.tsx

function EpisodeButton({ ep, showId, seasonNum, onToggleEpisode, onRefetch }: { ep: import('../services/api').Episode, showId: string, seasonNum: number, onToggleEpisode: (showId: string, season: number, episode: number) => void | Promise<void>, onRefetch?: () => Promise<import('../services/api').TvShow | null> }) {
	const [loading, setLoading] = useState(false)

	return (
		<button
			key={ep.id}
			type="button"
			className={`${styles.episodeButton} ${ep.watched ? styles.episodeWatched : ''}`}
			onClick={async () => {
				if (loading) return
				setLoading(true)
				try {
					// optimistic flip: update UI immediately by calling a minimal api toggle (backend is mock)
					await onToggleEpisode(showId, seasonNum, ep.episode)
					await onRefetch?.()
				} finally {
					setLoading(false)
				}
			}}
			title={ep.title}
			disabled={loading}
		>
			<span className={styles.episodeNumber}>E{ep.episode}</span>
			<span className={styles.episodeTitle}>{loading ? 'Updating…' : ep.title}</span>
		</button>
	)
}

export default function ShowDetailPanel({ show, isLoading, onBack, onToggleEpisode, onAdd, onRefetch }: ShowDetailPanelProps) {
	const [localShow, setLocalShow] = useState<TvShow | null>(show)

	// displayShow uses local optimistic state when present
	const displayShow = localShow ?? show

	function recomputeCounts(s: TvShow) {
		const watched = (s.seasons ?? []).reduce((acc, season) => acc + season.episodes.filter((ep) => ep.watched).length, 0)
		return { ...s, episodesWatched: watched }
	}

	const handleToggleEpisode = async (showId: string, seasonNum: number, episodeNum: number) => {
		// optimistic update locally
		setLocalShow((prev) => {
			if (!prev) return prev
			const copy: TvShow = JSON.parse(JSON.stringify(prev))
			const season = copy.seasons?.find((s) => s.season === seasonNum)
			if (!season) return prev
			const ep = season.episodes.find((e) => e.episode === episodeNum)
			if (!ep) return prev
			ep.watched = !ep.watched
			return recomputeCounts(copy)
		})

		try {
			await onToggleEpisode(showId, seasonNum, episodeNum)
		} catch {
			// on error, refetch from server to restore
			await onRefetch?.()
		}
	}

	const handleOptimisticSeasonUpdate = (seasonNum: number, episodeNums: number[], watched: boolean) => {
		setLocalShow((prev) => {
			if (!prev) return prev
			const copy: TvShow = JSON.parse(JSON.stringify(prev))
			const season = copy.seasons?.find((s) => s.season === seasonNum)
			if (!season) return prev
			season.episodes.forEach((ep) => {
				if (episodeNums.includes(ep.episode)) ep.watched = watched
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
				<button className={styles.secondaryButton} onClick={onBack} type="button">
					← Back
				</button>
				<button className={styles.secondaryButton} onClick={() => onAdd(show)} type="button">
					Add
				</button>
				<h2>{show.title}</h2>
			</div>

			<div className={styles.showMeta}>
				<span>{show.network}</span>
				<span>{show.status}</span>
			</div>

			<p className={styles.showDescription}>{show.description}</p>

				{displayShow?.seasons && displayShow.seasons.length > 0 && (
				<div className={styles.seasonsContainer}>
					{displayShow.seasons.map((season) => (
						<section key={season.season} className={styles.seasonSection}>
								<SeasonHeader season={season} showId={displayShow.id} onRefetch={onRefetch} onOptimisticUpdate={handleOptimisticSeasonUpdate} />
							<div className={styles.episodeGrid}>
								{season.episodes.map((ep) => (
									<EpisodeButton
										key={ep.id}
										ep={ep}
										showId={displayShow.id}
										seasonNum={season.season}
										onToggleEpisode={handleToggleEpisode}
										onRefetch={onRefetch}
									/>
								))}
							</div>
						</section>
					))}
				</div>
			)}
		</main>
	)
}
