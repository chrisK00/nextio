import { useEffect, useMemo, useState } from 'react'
import * as api from '../../../services/api'
import { useAppContext } from '../../../state/AppContext'
import type { TvShow } from '../../../services/api'
import { mergeShowsWithWatchlist, sortShowsByLastUpdated } from '../../show/utils/show'

type ShowStatus = 'unwatched' | 'upcoming' | 'watching'

export default function useShows(status: ShowStatus) {
    const { watchlist: localWatchlist } = useAppContext()
    const [shows, setShows] = useState<TvShow[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let mounted = true
        void (async () => {
            setLoading(true)
            try {
                let data: TvShow[]

                switch (status) {
                    case 'watching':
                        data = await api.getWatchingNow()
                        break
                    case 'unwatched':
                        data = await api.getUnwatchedShows()
                        break
                    case 'upcoming':
                        data = await api.getUpcomingReleases()
                        break
                }

                if (!mounted) { // in case the component unmounted while we were fetching, don't try to update state
                    return;
                }
                setShows(data)
            } finally {
                if (mounted)
                {
                    setLoading(false)
                }
            }
        })()// ← THIS LAST () CALLS THE FUNCTION IMMEDIATELY

        return () => {
            mounted = false
        }
    }, [status])

    // temporary solution to merge watchlist data with shows until we have a single source of truth for the watchlist data in the app
    const combined = useMemo(() => {
        const merged = mergeShowsWithWatchlist(shows, localWatchlist)
        return sortShowsByLastUpdated(merged, localWatchlist)
    }, [shows, localWatchlist])

    return { shows: combined, loading }
}
