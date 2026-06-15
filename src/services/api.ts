export type Episode = {
	id: string
	season: number
	episode: number
	title: string
	airDate?: string
	watched: boolean
}

export type Season = {
	season: number
	episodes: Episode[]
}

export type TvShow = {
	id: string
	title: string
	mediaType?: 'tv' | 'movie'
	network: string
	status: string
	episodesWatched: number
	episodesTotal: number
	nextEpisodeTitle: string
	nextEpisode?: string
	nextReleaseDate?: string
	description: string
	seasons?: Season[]
	posterUrl?: string
}

export type SearchResults = {
	tvShows: TvShow[]
	movies: TvShow[]
}

export type TvEpisodeItem = {
	season: number
	episode: number
	watched: boolean
}

export type LibraryTvShow = {
	id: string
	title: string
	posterUrl?: string
	network?: string
	status?: string
	description?: string
	nextReleaseDate?: string
	followedAt: string
	updatedAt: string
	lastSyncedAt?: string
	syncError?: string
	episodes: TvEpisodeItem[]
}

export type LibraryMovie = {
	id: string
	title: string
	posterUrl?: string
	description?: string
	watchedAt: string
}

export type LibraryResponse = {
	tvShows: LibraryTvShow[]
	movies: LibraryMovie[]
}

export type LibraryTvShowDetails = {
	show: LibraryTvShow
	episodes: TvEpisodeItem[]
}

export type LibrarySyncItem = {
	showId: string
	title: string
	success: boolean
	message: string
	syncedAt: string
}

export type LibrarySyncResponse = {
	total: number
	succeeded: number
	failed: number
	items: LibrarySyncItem[]
}

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

export type Settings = {
	notificationsEnabled: boolean
	darkMode: boolean
	preferredGenres: string[]
}

function mapSearchItem(result: Record<string, unknown>): TvShow {
	const mediaType = String(result.mediaType ?? result.MediaType ?? result['media_type'] ?? 'tv') as 'tv' | 'movie'
	const title = String(result.title ?? result.Title ?? result.name ?? result.Name ?? 'Untitled')
	const id = String(result.id ?? result.Id ?? title)
	const posterPath = String(result.posterUrl ?? result.PosterUrl ?? result.poster_path ?? result.PosterPath ?? '')
	const releaseYear = String(result.releaseYear ?? result.ReleaseYear ?? '')
	const releaseDate = String(result.nextReleaseDate ?? result.NextReleaseDate ?? result.release_date ?? result.ReleaseDate ?? result.first_air_date ?? result.FirstAirDate ?? '')

	return {
		id: `${mediaType}:${id}`,
		title,
		mediaType,
		network: mediaType === 'movie' ? 'Movie' : 'TV',
		status: 'Released',
		episodesWatched: 0,
		episodesTotal: 1,
		nextEpisodeTitle: mediaType === 'movie' ? 'Movie' : 'TV Series',
		nextEpisode: releaseYear || releaseDate || undefined,
		nextReleaseDate: releaseDate || undefined,
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

// TODO cache on backend not frontend? i wonder how much ram this could use
const seasonsCache = new Map<string, { seasons: Season[]; expiresAt: number }>()
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

export async function getShowSeasons(showId: string): Promise<Season[]> {
	const cached = seasonsCache.get(showId)
	if(cached && cached.expiresAt > Date.now()) return cached.seasons

	try {
		const [, rawId] = showId.includes(':') ? showId.split(':', 2) : ['tv', showId]
		const res = await fetch(`${API_BASE}/search/tv/${encodeURIComponent(rawId)}/seasons`)
		if(!res.ok) return []
		const data = await res.json() as TmdbSeason[]
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
		}))
		seasonsCache.set(showId, { seasons, expiresAt: Date.now() + CACHE_TTL_MS })
		return seasons
	} catch {
		return []
	}
}

export async function clearLibraryProgress(showId: string): Promise<void> {
	await fetchWithAuth(`/library/tv/${encodeURIComponent(showId)}/episodes`, { method: 'DELETE' })
}

export async function toggleEpisodeWatched(_showId: string, _season: number, _episode: number): Promise<void> {
	// TODO: Implement episode watched toggle when backend API is ready
	void _showId
	void _season
	void _episode
	return Promise.resolve()
}

export async function getAppSettings(): Promise<Settings> {
	return Promise.resolve({
		notificationsEnabled: true,
		darkMode: false,
		preferredGenres: ['Drama', 'Sci-Fi', 'Mystery'],
	})
}

export async function getLibrary(): Promise<LibraryResponse> {
	try {
		const res = await fetchWithAuth('/library')
		if(!res.ok) return { tvShows: [], movies: [] }
		return normalizeLibrary(await res.json())
	} catch {
		return { tvShows: [], movies: [] }
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

function normalizeLibrary(data: unknown): LibraryResponse {
	const payload = data as Partial<LibraryResponse> | null
	return {
		tvShows: Array.isArray(payload?.tvShows) ? payload!.tvShows : [],
		movies: Array.isArray(payload?.movies) ? payload!.movies : [],
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
		}),
	})
}

export async function removeLibraryTvShow(id: string): Promise<void> {
	await fetchWithAuth(`/library/tv/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function removeLibraryMovie(id: string): Promise<void> {
	await fetchWithAuth(`/library/movies/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function setLibraryEpisodeWatched(showId: string, season: number, episode: number, watched?: boolean): Promise<void> {
	await fetchWithAuth(`/library/tv/${encodeURIComponent(showId)}/episodes`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ season, episode, watched }),
	})
}

export async function syncLibrary(): Promise<LibrarySyncResponse> {
	const res = await fetchWithAuth('/library/sync', { method: 'POST' })
	if(!res.ok) {
		throw new Error(await res.text())
	}
	return res.json()
}

export async function saveAppSettings(settings: Settings): Promise<Settings> {
	return Promise.resolve(settings)
}

// --- Authentication API ---
// TODO move to its own file
export type AuthResponse = {
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
