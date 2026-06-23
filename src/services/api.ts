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

function mapSearchItem(result: Record<string, unknown>): TvShow {
	const mediaType = String(result.mediaType ?? result.MediaType ?? result['mediaType'] ?? 'tv') as 'tv' | 'movie'
	const title = String(result.title ?? result.Title ?? result.name ?? result.Name ?? 'Untitled')
	const id = String(result.id ?? result.Id ?? title)
	const posterPath = String(result.posterUrl ?? result.PosterUrl ?? result.poster_path ?? result.PosterPath ?? '')
	const releaseDate = String(result.releaseDate);
	const status = String(result.status);

	return {
		id: `${mediaType}:${id}`,
		title,
		mediaType,
		status: status,
		episodesWatched: 0,
		episodesTotal: 1,
		releaseDate: releaseDate,
		description: String(result.description ?? result.Description ?? `Search result for ${title}`),
		posterUrl: posterPath.startsWith('http') ? posterPath : (posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : undefined),
	}
}

export async function searchShows(query: string): Promise<SearchResults> {
	const trimmed = query.toLowerCase().trim()
	if(!trimmed) {
		return emptySearchResults
	}

	const params = new URLSearchParams({
		query: trimmed,
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

// TODO cache on backend not frontend :D
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
	return Promise.resolve({
		notificationsEnabled: true,
		darkMode: false,
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
		items: Array.isArray(payload?.items) ? payload!.items : [],
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
	await fetchWithAuth(`/library/movies/${encodeURIComponent(id)}/watched`, {
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
		const r = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
		if(r.ok) {
			const data = await r.json() as AuthResponse
			localStorage.setItem('token', data.token)
			// retry original request once
			const retryHeaders = new Headers(opts.headers || {})
			retryHeaders.set('Authorization', `Bearer ${data.token}`)
			const retryUrl = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
			return fetch(retryUrl, { ...opts, credentials: 'include', headers: retryHeaders })
		}
	}

	return res
}

export async function getProtectedTest(): Promise<void> {
	const res = await fetchWithAuth('/test/auth')
	if(!res.ok) throw new Error(await res.text())
}
