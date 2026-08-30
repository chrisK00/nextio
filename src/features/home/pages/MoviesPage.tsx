import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ShowMediaType, type LibraryMovie } from "../../../services/apiTypes"
import ShowCard from '../../show/components/ShowCard'
import styles from '../../../App.module.css'
import { getLibrary, setLibraryMovieWatched } from '../../../services/api'
import type { WatchlistItem } from '../../show/utils/show'
import FilterButton from '../../../components/common/FilterButton'
import useGenreFilter from '../../../hooks/useGenreFilter'
import GenreSelect from '../../../components/common/GenreSelect'

type MovieFilter = 'all' | 'watched' | 'unwatched'

const filters: { key: MovieFilter; label: string; tooltip: string }[] = [
  { key: 'all', label: 'All', tooltip: 'Every movie in your library.' },
  { key: 'watched', label: 'Watched', tooltip: 'Movies you\'ve already marked as watched.' },
  { key: 'unwatched', label: 'Unwatched', tooltip: 'Movies in your library you haven\'t watched yet.' },
]

const cachedMovies: Record<string, WatchlistItem[]> = {}

export default function MoviesPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = (searchParams.get('status') as MovieFilter | null) ?? 'all'
  const [loading, setLoading] = useState(!cachedMovies[filter])
  const [error, setError] = useState('')
  const [movies, setMovies] = useState<WatchlistItem[]>(() => cachedMovies[filter] ?? [])

  useEffect(() => {
    let mounted = true
    const fetchMovies = async () => {
      try {
        if(!cachedMovies[filter]) {
          setLoading(true)
        }
        setError('')
        const response = await getLibrary<LibraryMovie>(ShowMediaType.Movie, filter === 'all' ? undefined : filter)
        const mapped: WatchlistItem[] = response.items.map((movie) => ({
          id: movie.id,
          title: movie.title,
          mediaType: 'movie',
          description: movie.description ?? 'No description.',
          posterUrl: movie.posterUrl,
          status: movie.watched ? 'Watched' : 'Unwatched',
          episodesWatched: movie.watched ? 1 : 0,
          episodesTotal: 1,
          nextUserEpisode: undefined,
          nextAiringEpisode: undefined,
          seasons: undefined,
          releaseDate: movie.releaseDate,
          lastUpdatedAt: undefined,
        }))

        if(mounted) {
          cachedMovies[filter] = mapped
          setMovies(mapped)
          const savedScroll = sessionStorage.getItem('movies_scroll')
          if(savedScroll) {
            sessionStorage.removeItem('movies_scroll')
            requestAnimationFrame(() => {
              window.scrollTo({ top: Number(savedScroll), behavior: 'instant' as ScrollBehavior })
            })
          }
        }
      } catch (e: unknown) {
        console.error('Failed to fetch movies:', e)
        if(mounted) setError(e instanceof Error ? e.message : 'Something went wrong')
      } finally {
        if(mounted) setLoading(false)
      }
    }

    void fetchMovies()
    return () => { mounted = false }
  }, [filter])

  async function toggleWatched(movie: WatchlistItem) {
    const watched = movie.status !== 'Watched'
    await setLibraryMovieWatched(movie.id, watched)
    setMovies((current) => {
      const next = current
        .map((item) =>
          item.id === movie.id
            ? { ...item, status: watched ? 'Watched' : 'Unwatched', episodesWatched: watched ? 1 : 0, lastUpdatedAt: new Date().toISOString() }
            : item,
        )
      if (filter === 'all') {
        return next
      }
      return next.filter((item) => item.status.toLowerCase() === filter)
    })
  }

  function openMovie(movieId: string) {
    sessionStorage.setItem('movies_scroll', String(window.scrollY))
    const normalizedMovieId = movieId.startsWith('movie:') ? movieId.slice('movie:'.length) : movieId
    navigate(`/show/${encodeURIComponent(`movie:${normalizedMovieId}`)}`)
  }

  const [movieQuery, setMovieQuery] = useState(() => sessionStorage.getItem('movies_search') ?? '')
  const [genre, setGenre] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { genres, counts, loading: genresLoading, filter: filterMovies } = useGenreFilter(movies)

  useEffect(() => {
    sessionStorage.setItem('movies_search', movieQuery)
  }, [movieQuery])

  const filteredMovies = useMemo(() => {
    return filterMovies(movieQuery, genre)
  }, [filterMovies, movieQuery, genre])

  function setFilter(nextFilter: MovieFilter) {
    const params = new URLSearchParams(searchParams)
    if (nextFilter === 'all') {
      params.delete('status')
    } else {
      params.set('status', nextFilter)
    }
    setSearchParams(params)
  }

  if (loading) {
    return (
      <main className={styles.mainPanel}>
        <div className={styles.loadingBar} />
      </main>
    )
  }

  if (error) {
    return (
      <main className={styles.mainPanel}>
        <div className={styles.emptyState}>Error: {error}</div>
      </main>
    )
  }

  return (
    <main className={styles.mainPanel}>
      <section className={styles.tabContent}>
        <div className={styles.watchingToolbar}>
          <div className={styles.sortControls}>
            {filters.map((item) => (
              <FilterButton
                key={item.key}
                label={item.label}
                active={item.key === filter}
                tooltip={item.tooltip}
                onClick={() => setFilter(item.key)}
              />
            ))}
          </div>
          <div className={styles.librarySearchWrap}>
            <div className={styles.searchInputWrap}>
            <input
              ref={searchInputRef}
              type="text"
              value={movieQuery}
              onChange={(e) => setMovieQuery(e.target.value)}
              placeholder="Filter by movie name..."
              className={styles.librarySearchInput}
            />
            {movieQuery && <button onClick={() => setMovieQuery('')} className={styles.librarySearchClear} type="button" title="Clear filter">✕</button>}
            </div>
            <GenreSelect genres={genres} counts={counts} loading={genresLoading} value={genre} onChange={setGenre} />
            {movieQuery && (
              <button
                onClick={() => setMovieQuery('')}
                className={styles.librarySearchClear}
                type="button"
                title="Clear filter"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {filteredMovies.length === 0 ? (
          <div className={styles.emptyState}>
            {movieQuery ? (
              <div>
                <p>No saved movies matching "{movieQuery}" in this view.</p>
                <button
                  className={styles.globalSearchButton}
                  onClick={() => navigate(`/search?q=${encodeURIComponent(movieQuery)}`)}
                  type="button"
                >
                  Search TMDb globally
                </button>
              </div>
            ) : filter === 'unwatched'
              ? 'No unwatched movies yet.'
              : filter === 'watched'
                ? 'No watched movies yet.'
                : 'No movies in your library yet.'}
          </div>
        ) : (
          <div className={styles.showGridCompact}>
            {filteredMovies.map((movie) => (
              <ShowCard
                key={movie.id}
                show={movie}
                compact
                onClick={() => openMovie(movie.id)}
                action={
                  <div className={styles.showCardMeta}>
                    <button
                      className={styles.secondaryButton}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        void toggleWatched(movie)
                      }}
                    >
                      {movie.status === 'Watched' ? 'Mark unwatched' : 'Mark watched'}
                    </button>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
