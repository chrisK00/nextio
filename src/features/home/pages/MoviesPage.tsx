import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ShowMediaType, type LibraryMovie } from "../../../services/apiTypes"
import ShowCard from '../../show/components/ShowCard'
import styles from '../../../App.module.css'
import { getLibrary, setLibraryMovieWatched } from '../../../services/api'
import type { WatchlistItem } from '../../show/utils/show'
import FilterButton from '../../../components/common/FilterButton'

type MovieFilter = 'all' | 'watched' | 'unwatched'

const filters: { key: MovieFilter; label: string; tooltip: string }[] = [
  { key: 'all', label: 'All', tooltip: 'Every movie in your library.' },
  { key: 'watched', label: 'Watched', tooltip: 'Movies you\'ve already marked as watched.' },
  { key: 'unwatched', label: 'Unwatched', tooltip: 'Movies in your library you haven\'t watched yet.' },
]

export default function MoviesPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [movies, setMovies] = useState<WatchlistItem[]>([])

  const filter = (searchParams.get('status') as MovieFilter | null) ?? 'all'

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true)
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

        setMovies(mapped)
      } catch (e: unknown) {
        console.error('Failed to fetch movies:', e)
        setError(e instanceof Error ? e.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }

    void fetchMovies()
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
    const normalizedMovieId = movieId.startsWith('movie:') ? movieId.slice('movie:'.length) : movieId
    navigate(`/show/${encodeURIComponent(`movie:${normalizedMovieId}`)}`)
  }

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
        <div className={styles.emptyState}>Loading movies...</div>
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
        <div className={styles.settingsHeader}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
        </div>

        {movies.length === 0 ? (
          <div className={styles.emptyState}>
            {filter === 'unwatched'
              ? 'No unwatched movies yet.'
              : filter === 'watched'
                ? 'No watched movies yet.'
                : 'No movies in your library yet.'}
          </div>
        ) : (
          <div className={styles.showGrid}>
            {movies.map((movie) => (
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
