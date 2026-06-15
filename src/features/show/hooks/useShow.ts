import { useEffect, useState, useRef } from 'react'
import * as api from '../../../services/api'
import type { Season, TvShow } from '../../../services/api'
import { useAppContext } from '../../../state/AppContext'

export default function useShow(id?: string) {
  const { watchlist, movies } = useAppContext()
  const [show, setShow] = useState<TvShow | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Keep a ref so fetchShow always reads current watchlist/movies without being a dep
  const contextRef = useRef({ watchlist, movies })
  contextRef.current = { watchlist, movies }

  const fetchShow = async (showId: string): Promise<TvShow | null> => {
    const { watchlist: wl, movies: mv } = contextRef.current
    const tracked = wl.find((item) => item.id === showId) || mv.find((movie) => movie.id === showId)
    const isTrackedTv = tracked?.mediaType === 'tv'

    if(isTrackedTv) {
      const [library, tmdbSeasons] = await Promise.all([
        api.getLibraryTvShow(showId),
        api.getShowSeasons(showId),
      ])
      if(!library) return api.getShowDetails(showId)
      return mapLibraryShowDetails(library, tmdbSeasons)
    }

    const [details, seasons] = await Promise.all([
      api.getShowDetails(showId),
      (tracked?.mediaType !== 'movie') ? api.getShowSeasons(showId) : Promise.resolve([]),
    ])
    if(!details) return null
    return { ...details, seasons: seasons.length > 0 ? seasons : undefined }
  }

  useEffect(() => {
    if(!id) return
    let mounted = true
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const details = await fetchShow(id)
        if(!mounted) return
        setShow(details)
      } catch(e) {
        if(!mounted) return
        setError(e as Error)
      } finally {
        if(mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, watchlist, movies])

  return {
    show, loading, error, refetch: async () => {
      if(!id) return null
      const details = await fetchShow(id)
      setShow(details)
      return details
    }
  }
}

function mapLibraryShowDetails(library: api.LibraryTvShowDetails, tmdbSeasons: Season[]): TvShow {
  const episodes = [...library.episodes].sort((a, b) => a.season - b.season || a.episode - b.episode)
  const watchedMap = new Map(episodes.map((e) => [`${e.season}-${e.episode}`, e.watched]))
  const seasonsMap = new Map<number, Season['episodes']>()

  if(tmdbSeasons.length > 0) {
    for(const s of tmdbSeasons) {
      seasonsMap.set(s.season, s.episodes.map((ep) => ({
        ...ep,
        watched: watchedMap.get(`${ep.season}-${ep.episode}`) ?? false,
      })))
    }
  } else {
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
    episodesWatched: episodes.filter((e) => e.watched).length,
    episodesTotal: Math.max(episodes.length, 1),
    nextEpisodeTitle: library.show.nextReleaseDate ? 'Next release' : 'Tracked show',
    nextEpisode: library.show.nextReleaseDate,
    nextReleaseDate: library.show.nextReleaseDate,
    description: library.show.description ?? library.show.title,
    posterUrl: library.show.posterUrl,
    seasons,
  }
}
