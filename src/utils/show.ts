import type { TvShow } from '../services/api'

export type WatchlistItem = {
    id: string
    title?: string
    posterUrl?: string
    lastUpdatedAt?: string
}

export const isRunningShow = (show: TvShow) => Boolean(show.nextReleaseDate)

export const getReleaseCountdown = (show: TvShow) => {
    if(!show.nextReleaseDate) return 'TBD'
    const now = new Date()
    const release = new Date(show.nextReleaseDate)
    const msPerDay = 1000 * 60 * 60 * 24
    const days = Math.ceil((release.getTime() - now.getTime()) / msPerDay)
    if(days <= 0) return 'Today'
    return `In ${days} day${days === 1 ? '' : 's'}`
}

export const sortShowsByLastUpdated = (shows: TvShow[], watchlist: WatchlistItem[]) => {
    const updatedMap = new Map(watchlist.map((item) => [item.id, item.lastUpdatedAt]))
    return [...shows].sort((a, b) => {
        const aUpdated = updatedMap.get(a.id)
        const bUpdated = updatedMap.get(b.id)

        if(aUpdated && bUpdated) {
            return aUpdated > bUpdated ? -1 : 1
        }
        if(aUpdated) return -1
        if(bUpdated) return 1
        return a.title.localeCompare(b.title)
    })
}

export const mergeShowsWithWatchlist = (shows: TvShow[], watchlist: WatchlistItem[]) => {
    const map = new Map(shows.map((show) => [show.id, show]))
    for(const item of watchlist) {
        if(!map.has(item.id)) {
            map.set(item.id, {
                id: item.id,
                title: item.title ?? 'Unknown',
                network: '',
                status: '',
                episodesWatched: 0,
                episodesTotal: 0,
                nextEpisodeTitle: '',
                description: '',
                posterUrl: item.posterUrl,
            })
        }
    }
    return Array.from(map.values())
}
