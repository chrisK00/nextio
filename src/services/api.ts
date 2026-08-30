import { type Settings, type LibraryResponse, type LibraryTvShowDetails, type SearchResults, type Season, type TvShow } from "./apiTypes"

export const emptySearchResults: SearchResults = {
	tvShows: [],
	movies: [],
}

export function normalizeSearchResults(results?: Partial<SearchResults> | null): SearchResults {
	return {
		tvShows: results?.tvShows ?? [],
		movies: results?.movies ?? [],
	}
}

export function normalizeId(id: string): string {
	if(id.startsWith('tv:')) {
		return id.slice(3);
	}

	if(id.startsWith('movie:')) {
		return id.slice(6);
	}

	return id;
}

function mapSearchItem(result: Record<string, unknown>): TvShow {
	const mediaType = String(result.mediaType ?? result.MediaType ?? result['mediaType'] ?? 'tv') as 'tv' | 'movie'
	const title = String(result.title ?? result.Title ?? result.name ?? result.Name ?? 'Untitled')
	const id = String(result.id ?? result.Id ?? title)
	const posterPath = String(result.posterUrl ?? result.PosterUrl ?? result.poster_path ?? result.PosterPath ?? '')
	const releaseDate = String(result.releaseDate ?? result.ReleaseDate ?? '');
	const status = String(result.status ?? result.Status ?? '');
	const rawVoteAverage = result.voteAverage ?? result.VoteAverage ?? result.vote_average;
	const voteAverage = typeof rawVoteAverage === 'number' ? rawVoteAverage : undefined;
	const rawGenres = result.genres ?? result.Genres;
	const genres = Array.isArray(rawGenres)
		? rawGenres.map((genre) => typeof genre === 'string' ? genre : String((genre as Record<string, unknown>).name ?? '')).filter(Boolean)
		: undefined;
	const rawVoteCount = result.voteCount ?? result.VoteCount ?? result.vote_count;
	const voteCount = typeof rawVoteCount === 'number' ? rawVoteCount : undefined;
	const rawRuntime = result.runtime ?? result.Runtime;
	const runtime = typeof rawRuntime === 'number' ? rawRuntime : undefined;

	return {
		id: `${mediaType}:${id}`,
		title,
		mediaType,
		status: status,
		episodesWatched: 0,
		episodesTotal: 1,
		releaseDate: releaseDate || undefined,
		description: String(result.description ?? result.Description ?? `Search result for ${title}`),
		posterUrl: posterPath.startsWith('http') ? posterPath : (posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : undefined),
		voteAverage,
		genres,
		voteCount,
		runtime,
	}
}

export async function searchShows(query: string, includeAdult: boolean = false): Promise<SearchResults> {
	const trimmed = query.toLowerCase().trim()
	if(!trimmed) {
		return emptySearchResults
	}

	const params = new URLSearchParams({
		query: trimmed,
		includeAdult: String(includeAdult),
	})

	try {
		const response = await fetch(`${API_BASE}/search?${params.toString()}`)
		const data = await response.json()

		if(!data) {
			return emptySearchResults
		}

		const tvShows = Array.isArray(data.tvShows) ? data.tvShows.map((item: unknown) => mapSearchItem(item as Record<string, unknown>)) : []
		const movies = Array.isArray(data.movies) ? data.movies.map((item: unknown) => mapSearchItem(item as Record<string, unknown>)) : []
		return normalizeSearchResults({ tvShows, movies })
	} catch {
		return emptySearchResults
	}
}

export async function getShowDetails(imdbId: string): Promise<TvShow | null> {
	try {
		const [mediaType, rawId] = imdbId.includes(':') ? imdbId.split(':', 2) : ['tv', imdbId]
		const response = await fetch(`${API_BASE}/search/${encodeURIComponent(mediaType)}/${encodeURIComponent(rawId)}`)
		const data = await response.json()

		if(!data) {
			return null
		}

		const result = data as Record<string, unknown>
	const show = mapSearchItem(result)
		return show
	} catch {
		return null
	}
}

type TmdbSeasonEpisode = { episodeNumber: number; name: string; airDate?: string }
type TmdbSeason = { seasonNumber: number; name: string; episodes: TmdbSeasonEpisode[] }

let cachedShow: { showId: string; seasons: Season[]; expiresAt: number } | null = null;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export async function getShowSeasons(showId: string): Promise<Season[]> {
	if(cachedShow && cachedShow.showId === showId && cachedShow.expiresAt > Date.now()) {
		return cachedShow.seasons;
	}

	try {
		const [, rawId] = showId.includes(':') ? showId.split(':', 2) : ['tv', showId];
		const res = await fetch(`${API_BASE}/search/tv/${encodeURIComponent(rawId)}/seasons`);
		if(!res.ok) return [];
		const data = await res.json() as TmdbSeason[];
		const seasons = data.map((s) => ({
			season: s.seasonNumber,
			episodes: s.episodes.map((e) => ({
				id: `${showId}-${s.seasonNumber}-${e.episodeNumber}`,
				season: s.seasonNumber,
				episode: e.episodeNumber,
				title: e.name,
				airDate: e.airDate,
				watched: false,
			})),
		}));

		cachedShow = { showId, seasons, expiresAt: Date.now() + CACHE_TTL_MS };

		return seasons;
	} catch {
		return [];
	}
}
export async function clearLibraryProgress(showId: string): Promise<void> {
	await fetchWithAuth(`/library/tv/${encodeURIComponent(showId)}/episodes`, { method: 'DELETE' })
}

/** Fetch episode overview/description on demand (only called when modal opens). */
export async function getEpisodeDetail(showId: string, season: number, episode: number): Promise<string> {
	try {
		const [, rawId] = showId.includes(':') ? showId.split(':', 2) : ['tv', showId]
		const res = await fetch(`${API_BASE}/search/tv/${encodeURIComponent(rawId)}/season/${season}/episode/${episode}`)
		if(!res.ok) return ''
		const data = await res.json() as { overview?: string }
		return data.overview ?? 'No description found.'
	} catch(err) {
		return `FETCH ERROR: ${String(err)}`
	}
}

export async function getAppSettings(): Promise<Settings> {
	const saved = localStorage.getItem('settings')
	if (saved) {
		try {
			return JSON.parse(saved) as Settings
		} catch {
			// fallback
		}
	}
	return Promise.resolve({
		notificationsEnabled: true,
		darkMode: false,
		nsfwEnabled: false,
		defaultUpcomingView: 'list',
		preferredGenres: ['Drama', 'Sci-Fi', 'Mystery'],
	})
}

export async function saveAppSettings(settings: Settings): Promise<Settings> {
	// Settings are currently client-only; persist to localStorage for now.
	localStorage.setItem('settings', JSON.stringify(settings))
	return Promise.resolve(settings)
}

export async function getLibrary<T>(mediaType: string, status?: string): Promise<LibraryResponse<T>> {
	try {
		const params = status ? `?${new URLSearchParams({ status }).toString()}` : ''
		const res = await fetchWithAuth(`/library/${mediaType}${params}`)
		if(!res.ok) return { items: [], length: 0 }
		return normalizeLibrary(await res.json())
	} catch {
		return { items: [], length: 0 }
	}
}

export async function getLibraryTvShow(id: string): Promise<LibraryTvShowDetails | null> {
	try {
		const res = await fetchWithAuth(`/library/tv/${encodeURIComponent(id)}`)
		if(!res.ok) return null
		return await res.json() as LibraryTvShowDetails
	} catch {
		return null
	}
}

function normalizeLibrary<T>(data: unknown): LibraryResponse<T> {
	const payload = data as Partial<LibraryResponse<T>> | null
	return {
		items: Array.isArray(payload?.items) ? payload!.items.filter(x => x) : [],
		length: Number.isInteger(payload?.length) ? payload!.length! : 0,
	}
}

export async function addLibraryTvShow(show: TvShow): Promise<void> {
	await fetchWithAuth('/library/tv', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			id: show.id,
			title: show.title,
			posterUrl: show.posterUrl,
			mediaType: show.mediaType ?? 'tv',
			releaseDate: show.releaseDate,
		}),
	})
}

export async function addLibraryMovie(movie: TvShow): Promise<void> {
	await fetchWithAuth('/library/movies', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			id: movie.id,
			title: movie.title,
			posterUrl: movie.posterUrl,
			description: movie.description,
			mediaType: movie.mediaType ?? 'movie',
			releaseDate: movie.releaseDate,
		}),
	})
}

export async function removeLibraryTvShow(id: string): Promise<void> {
	await fetchWithAuth(`/library/tv/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function removeLibraryMovie(id: string): Promise<void> {
	await fetchWithAuth(`/library/movies/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function setLibraryMovieWatched(id: string, watched: boolean): Promise<void> {
	await fetchWithAuth(`/library/movies/${encodeURIComponent(normalizeId(id))}/watched`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ watched }),
	})
}

/** Toggle (or set) a single episode's watched state. */
export async function setLibraryEpisodeWatched(showId: string, season: number, episode: number, watched?: boolean): Promise<void> {
	await fetchWithAuth(`/library/tv/${encodeURIComponent(showId)}/episodes`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ season, episode, watched: watched ?? null }),
	})
}

/** Mark multiple episodes watched/unwatched in a single request (bulk endpoint). */
export async function setLibraryEpisodesWatchedBulk(
	showId: string,
	episodes: Array<{ season: number; episode: number; watched: boolean }>,
): Promise<void> {
	await fetchWithAuth(`/library/tv/${encodeURIComponent(showId)}/episodes/batch`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ episodes }),
	})
}

export async function getLibraryStats(): Promise<import('./apiTypes').LibraryStats> {
	const res = await fetchWithAuth('/stats/library')
	if(!res.ok) throw new Error(await res.text())
	return res.json() as Promise<import('./apiTypes').LibraryStats>
}

export async function triggerBackup(): Promise<{ success: boolean; backupFile: string }> {
	const res = await fetchWithAuth('/stats/backup', { method: 'POST' })
	if(!res.ok) throw new Error(await res.text())
	return res.json()
}

export async function getTrendingShows(includeAdult: boolean = false): Promise<SearchResults> {
	try {
		const response = await fetch(`${API_BASE}/search/trending?${new URLSearchParams({ includeAdult: String(includeAdult) })}`)
		if(!response.ok) return emptySearchResults
		const data = await response.json() as Partial<SearchResults>
		return normalizeSearchResults({
			tvShows: Array.isArray(data.tvShows) ? data.tvShows.map((item) => mapSearchItem(item as unknown as Record<string, unknown>)) : [],
			movies: Array.isArray(data.movies) ? data.movies.map((item) => mapSearchItem(item as unknown as Record<string, unknown>)) : [],
		})
	} catch {
		return emptySearchResults
	}
}

const EXPORT_REMINDER_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000

export function hasRecentLibraryExport(lastExportAt?: string | null): boolean {
	if (!lastExportAt) return false
	return Date.now() - Date.parse(lastExportAt) < EXPORT_REMINDER_INTERVAL_MS
}

export async function recordLibraryExport(): Promise<void> {
	await fetchWithAuth('/auth/library-export', { method: 'POST' })
}

export async function getLastLibraryExport(): Promise<string | null> {
	try {
		const response = await fetchWithAuth('/auth/library-export')
		if (!response.ok) return null
		return (await response.json() as { lastExportAt?: string | null }).lastExportAt ?? null
	} catch {
		return null
	}
}

export async function getBackups(): Promise<import('./apiTypes').BackupInfo[]> {
	const res = await fetchWithAuth('/stats/backups')
	if(!res.ok) return []
	return res.json()
}

export async function getUserLists(mediaType?: string): Promise<import('./apiTypes').UserList[]> {
	const query = mediaType ? `?mediaType=${encodeURIComponent(mediaType)}` : ''
	const res = await fetchWithAuth(`/library/lists${query}`)
	if(!res.ok) return []
	return res.json()
}

export async function getUserList(id: string): Promise<import('./apiTypes').UserList> {
	const res = await fetchWithAuth(`/library/lists/${encodeURIComponent(id)}`)
	if(!res.ok) throw new Error(await res.text())
	return res.json()
}

export async function createUserList(name: string, description?: string, mediaType: 'tv' | 'movie' = 'tv'): Promise<import('./apiTypes').UserList> {
	const res = await fetchWithAuth('/library/lists', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ name, description, mediaType }),
	})
	if(!res.ok) throw new Error(await res.text())
	return res.json()
}

export async function deleteUserList(id: string): Promise<void> {
	await fetchWithAuth(`/library/lists/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function addListItem(listId: string, item: { itemId: string; title: string; posterUrl?: string; releaseDate?: string }): Promise<import('./apiTypes').UserList> {
	const res = await fetchWithAuth(`/library/lists/${encodeURIComponent(listId)}/items`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(item),
	})
	if(!res.ok) throw new Error(await res.text())
	return res.json()
}

export async function removeListItem(listId: string, itemId: string): Promise<import('./apiTypes').UserList> {
	const res = await fetchWithAuth(`/library/lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}`, {
		method: 'DELETE',
	})
	if(!res.ok) throw new Error(await res.text())
	return res.json()
}

export async function syncLibrary(): Promise<import('./apiTypes').LibrarySyncResponse> {
	const res = await fetchWithAuth('/library/sync', { method: 'POST' })
	if(!res.ok) throw new Error(await res.text())
	return res.json() as Promise<import('./apiTypes').LibrarySyncResponse>
}

type AuthResponse = {
	token: string
	expiresInSeconds: number
}

const API_BASE = `${import.meta.env.VITE_API_BASE_URL}/api`;

async function postJson<T>(path: string, body: unknown): Promise<T> {
	const res = await fetch(`${API_BASE}${path}`, {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})

	if(!res.ok) throw new Error(await res.text())
	return res.json()
}

export async function authRegister(username: string, password: string): Promise<AuthResponse> {
	return postJson<AuthResponse>('/auth/register', { username, password })
}

export async function authLogin(username: string, password: string): Promise<AuthResponse> {
	return postJson<AuthResponse>('/auth/login', { username, password })
}

export async function fetchWithAuth(path: string, opts: RequestInit = {}): Promise<Response> {
	const token = localStorage.getItem('token')
	const headers = new Headers(opts.headers || {})
	if(token) headers.set('Authorization', `Bearer ${token}`)

	const fetchOpts: RequestInit = { credentials: 'include', ...opts, headers }
	const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
	const res = await fetch(url, fetchOpts)

	if(res.status === 401) {
		// attempt refresh
		try {
			const r = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
			if(r.ok) {
				const data = await r.json() as AuthResponse
				localStorage.setItem('token', data.token)
				// retry original request once
				const retryHeaders = new Headers(opts.headers || {})
				retryHeaders.set('Authorization', `Bearer ${data.token}`)
				const retryUrl = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
				return fetch(retryUrl, { ...opts, credentials: 'include', headers: retryHeaders })
			} else {
				localStorage.removeItem('token')
				localStorage.removeItem('username')
			}
		} catch {
			localStorage.removeItem('token')
			localStorage.removeItem('username')
		}
	}

	return res
}

export async function getProtectedTest(): Promise<void> {
	const res = await fetchWithAuth('/test/auth')
	if(!res.ok) throw new Error(await res.text())
}
