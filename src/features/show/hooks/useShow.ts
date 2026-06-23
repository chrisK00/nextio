import { useEffect, useState, useRef } from 'react'
import * as api from '../../../services/api'
import type { TvShow, LibraryTvShowDetails, LibraryMovie } from "../../../services/apiTypes"
import type { Season } from "../../../services/apiTypes"
import { useAppContext } from '../../../state/AppContext'

function normalizeMovieId(value?: string) {
  if(!value) return value
  let normalized = value
  while(normalized.startsWith('movie:')) {
    normalized = normalized.slice('movie:'.length)
  }
  return normalized
}

export default function useShow(id?: string) {
  const { tvShows, isLibraryLoaded } = useAppContext()
  const [show, setShow] = useState<TvShow | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isTrackedMovie, setIsTrackedMovie] = useState(false)
  const [isWatchedMovie, setIsWatchedMovie] = useState(false)

  // TODO what is Keep a ref so fetchShow always reads current watchlist without being a dep
  const watchlistRef = useRef(tvShows)
  useEffect(() => {
    watchlistRef.current = tvShows
  }, [tvShows])

  const fetchShow = async (showId: string): Promise<TvShow | null> => {
    const normalizedMovieId = normalizeMovieId(showId)
    const isMovie = normalizedMovieId !== showId || showId.startsWith('movie:')

    if(isMovie) {
      const movieId = `movie:${normalizedMovieId}`
      const [details, movieLibrary] = await Promise.all([
        api.getShowDetails(movieId),
        api.getLibrary<LibraryMovie>('movie'),
      ])
      if(!details) return null

      const trackedMovie = movieLibrary.items.find((item) => normalizeMovieId(item.id) === normalizedMovieId)
      const isTracked = Boolean(trackedMovie)
      setIsTrackedMovie(isTracked)
      setIsWatchedMovie(trackedMovie?.watched ?? false)
      return { ...details, seasons: undefined }
    } else {
      const tracked = watchlistRef.current.find((item) => item.id === showId)
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
        api.getShowSeasons(showId),
      ])
      if(!details) return null
      return { ...details, seasons: seasons.length > 0 ? seasons : undefined }
    }
  }

  useEffect(() => {
    if(!id || !isLibraryLoaded) return
    let mounted = true
    void (async () => {
      // Only show full loading state if we don't have this show's data yet
      if(!show || show.id !== id) {
        setLoading(true)
      }
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
  }, [id, isLibraryLoaded])

  const isMovie = id?.startsWith('movie:')
  const isTracked = isMovie
    ? isTrackedMovie
    : (show ? tvShows.some((item) => item.id === show.id) : false)

  return {
    show,
    loading,
    error,
    isTracked,
    isMovieWatched: isWatchedMovie,
    setIsTracked: (tracked: boolean) => {
      if(isMovie) {
        setIsTrackedMovie(tracked)
      }
    },
    setMovieWatched: (watched: boolean) => {
      if(isMovie) {
        setIsWatchedMovie(watched)
      }
    },
    refetch: async () => {
      if(!id) return null
      const details = await fetchShow(id)
      setShow(details)
      return details
    }
  }
}

function mapLibraryShowDetails(library: LibraryTvShowDetails, tmdbSeasons: Season[]): TvShow {
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
    status: library.show.status ?? 'Tracked',
    episodesWatched: episodes.filter((e) => e.watched).length,
    episodesTotal: Math.max(episodes.length, 1),
    nextAiringEpisode: library.show.nextAiringEpisode,
    nextUserEpisode: library.show.nextUserEpisode,
    description: library.show.description ?? library.show.title,
    posterUrl: library.show.posterUrl,
    releaseDate: library.show.releaseDate,
    seasons,
  }
}
