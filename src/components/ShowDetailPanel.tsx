import type { TvShow } from '../services/api'
import styles from '../App.module.css'

type ShowDetailPanelProps = {
	show: TvShow | null
	isLoading: boolean
	onBack: () => void
	onToggleEpisode: (showId: string, season: number, episode: number) => void
}

export default function ShowDetailPanel({ show, isLoading, onBack, onToggleEpisode }: ShowDetailPanelProps) {
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
				<h2>{show.title}</h2>
			</div>

			<div className={styles.showMeta}>
				<span>{show.network}</span>
				<span>{show.status}</span>
			</div>

			<p className={styles.showDescription}>{show.description}</p>

			{show.seasons && show.seasons.length > 0 && (
				<div className={styles.seasonsContainer}>
					{show.seasons.map((season) => (
						<section key={season.season} className={styles.seasonSection}>
							<h3>Season {season.season}</h3>
							<div className={styles.episodeGrid}>
								{season.episodes.map((ep) => (
									<button
										key={ep.id}
										type="button"
										className={`${styles.episodeButton} ${ep.watched ? styles.episodeWatched : ''}`}
										onClick={() => onToggleEpisode(show.id, season.season, ep.episode)}
										title={ep.title}
									>
										<span className={styles.episodeNumber}>E{ep.episode}</span>
										<span className={styles.episodeTitle}>{ep.title}</span>
									</button>
								))}
							</div>
						</section>
					))}
				</div>
			)}
		</main>
	)
}
