import { useMemo } from 'react'
import { useAppContext } from '../../../state/AppContext'
import { sortShowsByLastUpdated } from '../../show/utils/show'

type ShowStatus = 'unwatched' | 'upcoming' | 'watching'

export default function useShows(status: ShowStatus) {
    const { tvShows } = useAppContext()

    const shows = useMemo(() => {
        const filtered = tvShows.filter((show) => {
            if(show.mediaType === 'movie') {
                return false
            }

            switch(status) {
                case 'watching':
                    return true
                case 'unwatched':
                    return show.nextUserEpisode &&
                        (show.nextUserEpisode.episode != show.nextAiringEpisode?.episode && show.nextUserEpisode.season != show.nextAiringEpisode?.season);
                case 'upcoming':
                    return Boolean(show.nextAiringEpisode)
            }
        })

        // TODO
        const weirdSorted = sortShowsByLastUpdated(filtered, tvShows);
        if(status == 'upcoming') {
            return weirdSorted.sort((a, b) => {
                const timeA = new Date(a.nextAiringEpisode!.releaseDate!).getTime();
                const timeB = new Date(b.nextAiringEpisode!.releaseDate!).getTime();
                return timeA - timeB;
            });
        }

        return weirdSorted;

    }, [status, tvShows])

    return { shows, loading: false }
}
