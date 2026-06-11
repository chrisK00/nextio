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

function mapImdbResult(result: Record<string, unknown>): TvShow {
	const title = String(result['#TITLE'] ?? 'Untitled')
	const imdbId = String(result['#IMDB_ID'] ?? title)
	const year = result['#YEAR'] ? String(result['#YEAR']) : 'Unknown'
	const actors = String(result['#ACTORS'] ?? '')
	const aka = String(result['#AKA'] ?? '')
	const posterUrl = String(result['#IMG_POSTER'] ?? '')

	return {
		id: imdbId,
		title,
		network: aka || 'IMDb',
		status: 'Released',
		episodesWatched: 0,
		episodesTotal: 1,
		nextEpisodeTitle: `Year ${year}`,
		nextEpisode: year,
		nextReleaseDate: undefined,
		description: actors || `Search result for ${title}`,
		posterUrl,
	}
}

export async function searchShows(query: string): Promise<TvShow[]> {
	const trimmed = query.toLowerCase().trim()
	if(!trimmed) {
		return []
	}

	const params = new URLSearchParams({
		q: trimmed,
		v: '1',
	})

	try {
		const response = await fetch(`https://imdb.iamidiotareyoutoo.com/search?${params.toString()}`)
		const data = await response.json()

		if(!data || data.ok !== true || !Array.isArray(data.description)) {
			return []
		}

		const results = data.description as unknown[]
		return results.slice(0, 12).map((item) => mapImdbResult(item as Record<string, unknown>))
	} catch {
		return []
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
	const params = new URLSearchParams({
		q: imdbId,
	})

	try {
		const response = await fetch(`https://imdb.iamidiotareyoutoo.com/search?${params.toString()}`)
		const data = await response.json()

		if(!data || data.ok !== true || !Array.isArray(data.description) || data.description.length === 0) {
			return null
		}

		const result = data.description[0] as Record<string, unknown>
		const show = mapImdbResult(result)
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

const API_BASE = '/api'

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

export async function getProtectedTest(): Promise<{ message: string }> {
	const res = await fetchWithAuth('/test')
	if(!res.ok) throw new Error(await res.text())
	return res.json()
}
