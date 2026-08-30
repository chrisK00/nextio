export type Episode = {
    id: string;
    season: number;
    episode: number;
    title: string;
    airDate?: string;
    watched: boolean;
}

export type Season = {
    season: number
    episodes: Episode[]
}

export type TvEpisodeItem = {
    season: number
    episode: number
    title: string
    releaseDate: string
    watched: boolean
}

export type TvShow = {
    id: string
    title: string
    mediaType?: 'tv' | 'movie'
    status: string
    episodesWatched: number
    episodesTotal: number
    nextUserEpisode?: TvEpisodeItem
    nextAiringEpisode?: TvEpisodeItem
    description: string
    seasons?: Season[]
    posterUrl?: string
    releaseDate?: string
    voteAverage?: number
    voteCount?: number
    runtime?: number
    genres?: string[]
}

export type SearchResults = {
    tvShows: TvShow[]
    movies: TvShow[]
}

export type LibraryTvShow = {
    id: string
    title: string
    posterUrl?: string
    network?: string
    status?: string
    description?: string
    releaseDate?: string
    nextUserEpisode?: TvEpisodeItem
    nextAiringEpisode?: TvEpisodeItem
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
    releaseDate?: string
    watched: boolean
}

export const ShowMediaType = {
    Movie: 'movie',
    Tv: 'tv',
} as const;

export type LibraryResponse<T> = {
    items: T[]
    length: number
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
    nsfwEnabled: boolean
    defaultUpcomingView?: 'list' | 'calendar'
    preferredGenres: string[]
}

export type LibraryStats = {
    totalMovies: number
    totalTvShows: number
    showsWithEpisodesButNotFollowed: number
    lastSyncAt: string | null
    lastSyncSucceeded: boolean | null
    lastSyncMessage: string | null
}

export type UserListItem = {
    id: string
    itemId: string
    title: string
    posterUrl?: string
    releaseDate?: string
    addedAt: string
    order: number
}

export type UserList = {
    id: string
    name: string
    description?: string
    mediaType: 'tv' | 'movie'
    createdAt: string
    updatedAt: string
    items: UserListItem[]
}

export type BackupInfo = {
    fileName: string
    sizeBytes: number
    createdAt: string
}
