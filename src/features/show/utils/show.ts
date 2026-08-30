import type { TvShow } from "../../../services/apiTypes"

export type WatchlistItem = TvShow & {
    lastUpdatedAt?: string
}

export const isRunningShow = (show: TvShow) => Boolean(show?.nextAiringEpisode?.releaseDate)

export const parseReleaseDate = (value: string) => {
    return new Date(value)
}

export const getReleaseCountdown = (show: TvShow) => {
    if(!show?.nextAiringEpisode?.releaseDate) return 'TBD'
    const now = new Date()
    const release = parseReleaseDate(show.nextAiringEpisode.releaseDate)
    const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
    const releaseUtc = Date.UTC(release.getFullYear(), release.getMonth(), release.getDate())
    const days = Math.round((releaseUtc - todayUtc) / (1000 * 60 * 60 * 24))
    if(days === 0) return 'Today'
    if(days < 0) return 'Past'
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
