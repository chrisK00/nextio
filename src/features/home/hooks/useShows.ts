import { useMemo } from 'react'
import { useAppContext } from '../../../state/AppContext'
import { sortShowsByLastUpdated } from '../../show/utils/show'

type ShowStatus = 'unwatched' | 'upcoming' | 'watching'

export default function useShows(status: ShowStatus) {
    const { watchlist } = useAppContext()

    const shows = useMemo(() => {
        const filtered = watchlist.filter((show) => {
            if(show.mediaType === 'movie') {
                return false
            }

            switch(status) {
                case 'watching':
                case 'unwatched':
                    return show.episodesWatched < show.episodesTotal
                case 'upcoming':
                    return Boolean(show.nextReleaseDate)
            }
        })

        return sortShowsByLastUpdated(filtered, watchlist)
    }, [status, watchlist])

    return { shows, loading: false }
}
