export type Episode = {
    id: string;
    season: number;
    episode: number;
    title: string;
    airDate?: string;
    watched: boolean;
}; export type Season = {
    season: number
    episodes: Episode[]
}
export type TvShow = {
    id: string
    title: string
    mediaType?: 'tv' | 'movie'
    status: string
    episodesWatched: number
    episodesTotal: number
    nextUserEpisode?: TvEpisodeItem,
    nextAiringEpisode?: TvEpisodeItem,
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
    title: string
    releaseDate: string
    watched: boolean
}
export type LibraryTvShow = {
    id: string
    title: string
    posterUrl?: string
    network?: string
    status?: string
    description?: string
    nextUserEpisode?: TvEpisodeItem,
    nextAiringEpisode?: TvEpisodeItem,
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

export type Settings = {
    notificationsEnabled: boolean
    darkMode: boolean
    preferredGenres: string[]
}

