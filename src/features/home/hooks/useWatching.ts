import { useEffect, useMemo, useState } from 'react'
import * as api from '../../../services/api'
import { useAppContext } from '../../../state/AppContext'
import type { TvShow } from '../../../services/api'
import { mergeShowsWithWatchlist, sortShowsByLastUpdated } from '../../show/utils/show'

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
        const merged = mergeShowsWithWatchlist(watching, localWatchlist)
        return sortShowsByLastUpdated(merged, localWatchlist)
    }, [watching, localWatchlist])

    const combinedUnwatched = useMemo(() => {
        const merged = mergeShowsWithWatchlist(unwatched, localWatchlist)
        return sortShowsByLastUpdated(merged, localWatchlist)
    }, [unwatched, localWatchlist])

    const combinedUpcoming = useMemo(() => mergeShowsWithWatchlist(upcoming, localWatchlist), [upcoming, localWatchlist])

    return { watching: combinedWatching, unwatched: combinedUnwatched, upcoming: combinedUpcoming, loading }
}
