import { useEffect, useState } from 'react'
import * as api from '../../../services/api'
import type { Season, TvShow } from '../../../services/api'
import { useAppContext } from '../../../state/AppContext'

export default function useShow(id?: string) {
  const { watchlist, movies } = useAppContext()
  const [show, setShow] = useState<TvShow | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if(!id) return
    let mounted = true
    void (async () => {
      setLoading(true)
        setError(null)
        try {
          const tracked = watchlist.find((item) => item.id === id) || movies.find((movie) => movie.id === id)
          const details = tracked?.mediaType === 'tv'
          ? await api.getLibraryTvShow(id).then((library) => library ? mapLibraryShowDetails(library) : api.getShowDetails(id))
          : await api.getShowDetails(id)
        if(!mounted) return
        setShow(details)
      } catch(e) {
        if(!mounted) return
        setError(e as Error)
      } finally {
        if(mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [id, movies, watchlist])

  return {
    show, loading, error, refetch: async () => {
      if(!id) return null
      const tracked = watchlist.find((item) => item.id === id) || movies.find((movie) => movie.id === id)
      const details = tracked?.mediaType === 'tv'
        ? await api.getLibraryTvShow(id).then((library) => library ? mapLibraryShowDetails(library) : api.getShowDetails(id))
        : await api.getShowDetails(id)
      setShow(details)
      return details
    }
  }
}

function mapLibraryShowDetails(library: api.LibraryTvShowDetails): TvShow {
  const episodes = [...library.episodes].sort((a, b) => a.season - b.season || a.episode - b.episode)
  const seasonsMap = new Map<number, Season['episodes']>()

  for(const episode of episodes) {
    const list = seasonsMap.get(episode.season) ?? []
    list.push({
      id: `${library.show.id}-${episode.season}-${episode.episode}`,
      season: episode.season,
      episode: episode.episode,
      title: `Episode ${episode.episode}`,
      watched: episode.watched,
    })
    seasonsMap.set(episode.season, list)
  }

  const seasons: Season[] = Array.from(seasonsMap.entries()).map(([season, seasonEpisodes]) => ({
    season,
    episodes: seasonEpisodes,
  }))

  return {
    id: library.show.id,
    title: library.show.title,
    mediaType: 'tv',
    network: library.show.network ?? 'TV',
    status: library.show.status ?? 'Tracked',
    episodesWatched: episodes.filter((episode) => episode.watched).length,
    episodesTotal: Math.max(episodes.length, 1),
    nextEpisodeTitle: library.show.nextReleaseDate ? 'Next release' : 'Tracked show',
    nextEpisode: library.show.nextReleaseDate,
    nextReleaseDate: library.show.nextReleaseDate,
    description: library.show.description ?? library.show.title,
    posterUrl: library.show.posterUrl,
    seasons,
  }
}
