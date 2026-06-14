import { showCatalog } from "./seedData"

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

export async function getWatchingNow(): Promise<TvShow[]> {
	return Promise.resolve(showCatalog.filter((show) => show.episodesWatched < show.episodesTotal).slice(0, 3))
}

export async function getUnwatchedShows(): Promise<TvShow[]> {
	return Promise.resolve(showCatalog.filter((show) => show.episodesWatched < show.episodesTotal))
}

export async function getUpcomingReleases(): Promise<TvShow[]> {
	return Promise.resolve(
		showCatalog
			.filter((show) => show.nextReleaseDate)
			.sort((a, b) => (a.nextReleaseDate! > b.nextReleaseDate! ? 1 : -1)),
	)
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

function generateMockSeasons(): Season[] {
	const seasons: Season[] = []
	for(let s = 1; s <= 3; s++) {
		const episodeCount = 10 + Math.floor(Math.random() * 3)
		const episodes: Episode[] = []
		for(let e = 1; e <= episodeCount; e++) {
			episodes.push({
				id: `${s}-${e}`,
				season: s,
				episode: e,
				title: `Episode ${e}`,
				watched: s === 1 && e <= 5,
			})
		}
		seasons.push({ season: s, episodes })
	}
	return seasons
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
		show.seasons = generateMockSeasons()
		return show
	} catch {
		return null
	}
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
	const res = await fetch(path.startsWith('/') ? path : `${API_BASE}${path}`, fetchOpts)

	if(res.status === 401) {
		// attempt refresh
		const r = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
		if(r.ok) {
			const data = await r.json() as AuthResponse
			localStorage.setItem('token', data.token)
			// retry original request once
			const retryHeaders = new Headers(opts.headers || {})
			retryHeaders.set('Authorization', `Bearer ${data.token}`)
			return fetch(path.startsWith('/') ? path : `${API_BASE}${path}`, { ...opts, credentials: 'include', headers: retryHeaders })
		}
	}

	return res
}

export async function getProtectedTest(): Promise<void> {
	const res = await fetchWithAuth('/test/auth')
	if(!res.ok) throw new Error(await res.text())
}
