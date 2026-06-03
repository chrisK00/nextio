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
                
                switch(status) {
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
                
                if(!mounted) return
                setShows(data)
            } finally {
                if(mounted) setLoading(false)
            }
        })()

        return () => {
            mounted = false
        }
    }, [status])

    const combined = useMemo(() => {
        const merged = mergeShowsWithWatchlist(shows, localWatchlist)
        return sortShowsByLastUpdated(merged, localWatchlist)
    }, [shows, localWatchlist])

    return { shows: combined, loading }
}
