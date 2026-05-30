import { useEffect, useMemo, useState } from 'react'
import * as api from '../services/api'
import { useAppContext } from '../state/AppContext'
import type { TvShow } from '../services/api'

type WatchlistItem = { id: string; title?: string; posterUrl?: string }

export default function useWatching() {
    const { watchlist: localWatchlist } = useAppContext()
    const [watching, setWatching] = useState<TvShow[]>([])
    const [unwatched, setUnwatched] = useState<TvShow[]>([])
    const [upcoming, setUpcoming] = useState<TvShow[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let mounted = true
        void (async () => {
            setLoading(true)
            try {
                const [w, u, up] = await Promise.all([api.getWatchingNow(), api.getUnwatchedShows(), api.getUpcomingReleases()])
                if(!mounted) return
                setWatching(w)
                setUnwatched(u)
                setUpcoming(up)
            } finally {
                if(mounted) setLoading(false)
            }
        })()

        return () => {
            mounted = false
        }
    }, [])

    const combinedWatching = useMemo(() => {
        const map = new Map(watching.map((s) => [s.id, s]))
        for(const item of localWatchlist as WatchlistItem[]) {
            if(!map.has(item.id)) {
                map.set(item.id, { id: item.id, title: item.title ?? 'Unknown', network: '', status: '', episodesWatched: 0, episodesTotal: 0, nextEpisodeTitle: '', description: '', })
            }
        }
        return Array.from(map.values())
    }, [watching, localWatchlist])

    const combinedUnwatched = useMemo(() => {
        const map = new Map(unwatched.map((s) => [s.id, s]))
        for(const item of localWatchlist as WatchlistItem[]) {
            if(!map.has(item.id)) {
                map.set(item.id, { id: item.id, title: item.title ?? 'Unknown', network: '', status: '', episodesWatched: 0, episodesTotal: 0, nextEpisodeTitle: '', description: '', })
            }
        }
        return Array.from(map.values())
    }, [unwatched, localWatchlist])

    const combinedUpcoming = useMemo(() => {
        const map = new Map(upcoming.map((s) => [s.id, s]))
        for(const item of localWatchlist as WatchlistItem[]) {
            if(!map.has(item.id)) {
                map.set(item.id, { id: item.id, title: item.title ?? 'Unknown', network: '', status: '', episodesWatched: 0, episodesTotal: 0, nextEpisodeTitle: '', description: '', })
            }
        }
        return Array.from(map.values())
    }, [upcoming, localWatchlist])

    return { watching: combinedWatching, unwatched: combinedUnwatched, upcoming: combinedUpcoming, loading }
}
