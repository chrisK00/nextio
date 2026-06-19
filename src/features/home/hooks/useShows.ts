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
                    // TODO only show shows where we havent watched all released episodes
                    return true
                case 'unwatched':
                    // show has a next episode to watch (not "Up to date")
                    return show.nextEpisodeTitle !== 'Up to date'
                case 'upcoming':
                    return Boolean(show.nextReleaseDate)
            }
        })

        return sortShowsByLastUpdated(filtered, watchlist)
    }, [status, watchlist])

    return { shows, loading: false }
}
