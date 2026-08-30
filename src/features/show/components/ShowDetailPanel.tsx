import { useState, useEffect, useRef } from 'react'
import type { TvShow, UserList } from "../../../services/apiTypes"
import styles from '../../../App.module.css'
import ShowSeasons from './ShowSeasons'
import * as api from '../../../services/api'

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
	const maxDescriptionLength = 70;

	const [isDescriptionExpanded, setDescriptionExpanded] = useState(false);
	const [showStickyHeader, setShowStickyHeader] = useState(false);
	const [showListModal, setShowListModal] = useState(false);
	const [availableLists, setAvailableLists] = useState<UserList[]>([]);
	const [listMsg, setListMsg] = useState<string | null>(null);
	const [newListName, setNewListName] = useState('');
	const seasonsRef = useRef<HTMLDivElement>(null);
	const description = show?.description || '';

	const nextEpisodeDateString = displayShow?.nextAiringEpisode?.releaseDate ? new Date(displayShow?.nextAiringEpisode?.releaseDate)
		.toDateString()
		: null;

	const isMovie = displayShow?.mediaType === 'movie';

	useEffect(() => {
		const handleScroll = () => {
			if(window.scrollY > 180) {
				setShowStickyHeader(true)
			} else {
				setShowStickyHeader(false)
			}
		}
		window.addEventListener('scroll', handleScroll, { passive: true })
		return () => window.removeEventListener('scroll', handleScroll)
	}, [])

	useEffect(() => {
		if(!isMovie && displayShow?.seasons && displayShow.seasons.length > 0) {
			const timer = setTimeout(() => {
				const firstUnwatched = document.querySelector(`.${styles.episodeButton}:not(.${styles.episodeWatched})`)
				if(firstUnwatched && window.scrollY < 50) {
					firstUnwatched.scrollIntoView({ behavior: 'smooth', block: 'center' })
				}
			}, 300)
			return () => clearTimeout(timer)
		}
	}, [displayShow?.id, displayShow?.seasons, isMovie])

	function scrollToTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' })
	}

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
			{showStickyHeader && (
				<div className={styles.stickyDetailHeader} onClick={scrollToTop} role="button" tabIndex={0}>
					<button className={styles.secondaryButton} onClick={(e) => { e.stopPropagation(); onBack(); }} type="button" style={{ padding: '6px 12px', minHeight: '32px' }}>
						← Back
					</button>
					<span className={styles.stickyTitle}>{displayShow?.title}</span>
					<span className={styles.stickyScrollHint}>↑ Top</span>
				</div>
			)}
			{isLoading && <div className={styles.loadingBar} />}
			<div className={styles.detailHeader}>
				<div className={styles.detailHeaderActions}>
					<button className={styles.secondaryButton} onClick={onBack} type="button">
						← Back
					</button>
					<div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
						{show?.title && (
							<a
								href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${show.title} ${show.mediaType === 'movie' ? 'movie' : 'tv show'} official trailer`)}`}
								target="_blank"
								rel="noopener noreferrer"
								className={styles.secondaryButton}
								style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
								title="Watch trailer on YouTube"
							>
								▶ Trailer
							</a>
						)}
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
							onClick={async () => {
								if (!displayShow) return
								const mediaType = displayShow.mediaType === 'movie' ? 'movie' : 'tv'
								const lists = await api.getUserLists(mediaType)
								setAvailableLists(lists)
								setShowListModal(true)
								setListMsg(null)
							}}
							type="button"
						>
							➕ Add to List
						</button>
						<button
							className={styles.secondaryButton}
							onClick={() => show && onFollowToggle(show, isTracked)}
							type="button"
						>
							{isTracked ? 'Unfollow' : 'Add'}
						</button>
					</div>
				</div>

							{showListModal && (
					<div
						style={{
							position: 'fixed',
							top: 0,
							left: 0,
							right: 0,
							bottom: 0,
							background: 'rgba(0,0,0,0.7)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							zIndex: 1000,
							padding: '16px',
						}}
						onClick={() => setShowListModal(false)}
					>
						<div
							style={{
								background: 'var(--card-bg, #1a1a1a)',
								border: '1px solid var(--border)',
								borderRadius: '12px',
								padding: '24px',
								maxWidth: '420px',
								width: '100%',
							}}
							onClick={(e) => e.stopPropagation()}
						>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
								<h3 style={{ margin: 0 }}>Add to Custom List</h3>
								<button className={styles.secondaryButton} onClick={() => setShowListModal(false)} type="button">✕</button>
							</div>

							{listMsg && <p style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{listMsg}</p>}
							<div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
								<input
									value={newListName}
									onChange={(e) => setNewListName(e.target.value)}
									placeholder="New list name"
									style={{ flex: 1, minWidth: 0, padding: '9px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-h)', font: 'inherit' }}
								/>
								<button
									className={styles.primaryButton}
									type="button"
									disabled={!newListName.trim()}
									onClick={async () => {
										if (!displayShow || !newListName.trim()) return
																	try {
																		const created = await api.createUserList(newListName.trim(), undefined, displayShow.mediaType === 'movie' ? 'movie' : 'tv')
																		const updated = await api.addListItem(created.id, {
																			itemId: displayShow.id,
																			title: displayShow.title,
																			posterUrl: displayShow.posterUrl,
																			releaseDate: displayShow.releaseDate,
																		})
																		setNewListName('')
																		setAvailableLists((current) => [...current, updated])
																		setListMsg(`Created "${updated.name}" and added ${displayShow.title}`)
										} catch (error) {
											setListMsg(error instanceof Error ? error.message : 'Could not create list')
										}
									}}
								>Create</button>
							</div>

							{availableLists.length === 0 ? (
								<p style={{ color: 'var(--text-muted)' }}>
									No {displayShow?.mediaType === 'movie' ? 'movie' : 'TV'} lists found. Create one on the Lists page first!
								</p>
							) : (
								<div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
									{availableLists.map((l) => {
										const inList = l.items.some((i) => i.itemId === displayShow?.id)
										return (
											<div
												key={l.id}
												style={{
													display: 'flex',
													justifyContent: 'space-between',
													alignItems: 'center',
													padding: '10px 14px',
													borderRadius: '8px',
													background: 'var(--bg, #222)',
													border: '1px solid var(--border)',
												}}
											>
												<div>
													<strong>{l.name}</strong>
													<div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{l.items.length} items</div>
												</div>
												<button
													className={inList ? styles.secondaryButton : styles.primaryButton}
															 onClick={async () => {
																if (!displayShow) return
									try {
										if (inList) {
											const updated = await api.removeListItem(l.id, displayShow.id)
											setListMsg(`Removed from "${l.name}"`)
											setAvailableLists((current) => current.map((list) => list.id === updated.id ? updated : list))
										} else {
											const updated = await api.addListItem(l.id, {
												itemId: displayShow.id,
												title: displayShow.title,
												posterUrl: displayShow.posterUrl,
												releaseDate: displayShow.releaseDate,
											})
											setListMsg(`Added to "${l.name}"!`)
											setAvailableLists((current) => current.map((list) => list.id === updated.id ? updated : list))
										}
									} catch (error) {
																	setListMsg(error instanceof Error ? error.message : 'Could not update list')
																}
															}}
													type="button"
												>
													{inList ? 'Remove' : 'Add'}
												</button>
											</div>
										)
									})}
								</div>
							)}
						</div>
					</div>
				)}
				<div className={styles.detailHeaderMain}>
					{show?.posterUrl && (
						<div className={styles.detailThumbnail}>
							<img src={show.posterUrl} alt={`${show.title} poster`} />
						</div>
					)}
					<div className={styles.detailHeaderInfo}>
						<h2>{show?.title}</h2>
						<div className={styles.showMeta}>
							{show?.status && <span>Status: <strong>{show.status}</strong></span>}
							{show?.releaseDate && <span>({new Date(show.releaseDate).getFullYear()})</span>}
							{typeof show?.voteAverage === 'number' && show.voteAverage > 0 && (
								<span title={show.voteCount ? `${show.voteCount.toLocaleString()} TMDb votes` : undefined}>
									⭐ <strong>{show.voteAverage.toFixed(1)}</strong>/10 {show.voteCount ? <small style={{ opacity: 0.75 }}>({show.voteCount.toLocaleString()})</small> : null}
								</span>
							)}
							{typeof show?.runtime === 'number' && show.runtime > 0 && (
								<span>⏱️ <strong>{show.runtime >= 60 ? `${Math.floor(show.runtime / 60)}h ${show.runtime % 60}m` : `${show.runtime}m`}</strong></span>
							)}
							{nextEpisodeDateString && <span>Next Airing: <strong>{nextEpisodeDateString}</strong></span>}
						</div>
						{show?.nextUserEpisode && (
							<div className={styles.nextUserEpisodeBanner}>
								<span className={`${styles.badge} ${styles.badgeNext}`}>Next to watch</span>
								<span style={{ fontSize: '0.9rem', color: 'var(--text-h)', fontWeight: 600 }}>
									S{show.nextUserEpisode.season} E{show.nextUserEpisode.episode}
									{show.nextUserEpisode.title ? ` · ${show.nextUserEpisode.title}` : ''}
								</span>
							</div>
						)}
					</div>
				</div>
			</div>

			<p className={styles.showDescription}>
				{isMovie || isDescriptionExpanded || description.length <= maxDescriptionLength ? description : `${description.slice(0, maxDescriptionLength)}... `}

				{!isMovie && description.length > maxDescriptionLength && (
					<button onClick={() => setDescriptionExpanded(!isDescriptionExpanded)} style={{ border: 'none', background: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 'bold' }}>
						{isDescriptionExpanded ? 'Less' : 'More'}
					</button>
				)}
			</p>

			{!isMovie && displayShow?.seasons && displayShow.seasons.length > 0 && (
				<div ref={seasonsRef}>
					<ShowSeasons
						showId={displayShow.id}
						seasons={displayShow.seasons}
						onToggleEpisode={handleToggleEpisode}
						onRefetch={onRefetch}
						onOptimisticUpdate={handleOptimisticSeasonUpdate}
						isTracked={isTracked}
					/>
				</div>
			)}
		</main>
	)
}
