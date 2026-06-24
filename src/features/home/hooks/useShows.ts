import { useMemo } from 'react'
import { useAppContext } from '../../../state/AppContext'
import { sortShowsByLastUpdated } from '../../show/utils/show'

type ShowStatus = 'unwatched' | 'upcoming' | 'watching'

/**
 * Derives a filtered + sorted list of TV shows from the global library context.
 *
 * @param status  The view you are rendering:
 *   - `'watching'`  – all followed TV shows (the My Shows page)
 *   - `'unwatched'` – shows that have an unwatched next episode which is NOT the
 *                     same episode as the next *airing* episode (i.e. already released)
 *   - `'upcoming'`  – shows that have a future episode announced in TMDb
 *
 * @returns `{ shows, loading }` where `loading` is true until the library has
 * been fetched from the API for the first time.
 *
 * ### Why `isLibraryLoaded` instead of a local loading flag?
 * The library lives in AppContext and is loaded once at startup (or on login).
 * Any page that consumes it would flash an empty list while waiting. By using
 * the context-level `isLibraryLoaded` flag we ensure all views show a spinner
 * until the shared data is ready, without redundant requests.
 */
export default function useShows(status: ShowStatus) {
    const { tvShows, isLibraryLoaded } = useAppContext()

    const shows = useMemo(() => {
        const filtered = tvShows.filter((show) => {
            if(show.mediaType === 'movie') {
                return false
            }

            switch(status) {
                case 'watching':
                    return true
                case 'unwatched':
                    // Show appears here when there's a next episode to watch that has already aired.
                    // We exclude it when nextUserEpisode == nextAiringEpisode (still in the future).

                    // 1. '!!' forces a strict boolean return if nextUserEpisode is missing (avoids returning null/undefined).
                    return !!show.nextUserEpisode && (
                        show.nextUserEpisode.episode !== show.nextAiringEpisode?.episode ||
                        show.nextUserEpisode.season !== show.nextAiringEpisode?.season
                    );
                case 'upcoming':
                    return Boolean(show.nextAiringEpisode)
            }
        })

        // Primary sort: most-recently-updated shows first (so freshly synced shows bubble up).
        const showsSortedByLastUpdated = sortShowsByLastUpdated(filtered, tvShows);
        if(status === 'upcoming') {
            // Secondary sort for upcoming: soonest air date first.
            return showsSortedByLastUpdated.sort((a, b) => {
                const timeA = new Date(a.nextAiringEpisode!.releaseDate!).getTime();
                const timeB = new Date(b.nextAiringEpisode!.releaseDate!).getTime();
                return timeA - timeB;
            });
        }

        return showsSortedByLastUpdated;

    }, [status, tvShows])

    return { shows, loading: !isLibraryLoaded }
}
