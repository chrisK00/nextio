import { useNavigate } from 'react-router-dom'
import { ShowMediaType, type LibraryMovie, type TvShow } from "../../../services/apiTypes"
import ShowCard from '../../show/components/ShowCard'
import styles from '../../../App.module.css'
import { useEffect, useState } from 'react'
import { getLibrary } from '../../../services/api'
import type { WatchlistItem } from '../../show/utils/show'

export default function MoviesPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [movies, setMovies] = useState<WatchlistItem[]>([]);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true);
        const response = await getLibrary<LibraryMovie>(ShowMediaType.Movie);
        const a: WatchlistItem[] = response.items.map(x => ({
          id: x.id,
          title: x.title,
          mediaType: 'movie',
          description: x.description ?? 'No description.',
          posterUrl: x.posterUrl,
          status: '_',
          episodesWatched: 0,
          episodesTotal: 0,
          nextUserEpisode: undefined,
          nextAiringEpisode: undefined,
          seasons: undefined,
          releaseDate: undefined,
          lastUpdatedAt: undefined
          // status: x.status
          // releaseDate: x.releaseDate
        }));

        setMovies(a);
      } catch(e: unknown) {
        console.error("Failed to fetch movies:", e);
        if(e instanceof Error) {
          setError(e.message)
        } else {
          setError("Something went wrong");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();

  }, []);

  function handleMovieClick(movie: TvShow) {
    navigate(`/show/${encodeURIComponent(movie.id)}`)
  }

  if(movies.length === 0) {
    return (
      <main className={styles.mainPanel}>
        <div className={styles.emptyState}>No watched movies yet. Add a movie from search when you finish one.</div>
      </main>
    )
  }

  if(loading) return <div>Loading movies...</div>;
  if(error) return <div>Error: {error}</div>;
  return (
    <main className={styles.mainPanel}>
      <section className={styles.tabContent}>
        <div className={styles.showGrid}>
          {movies.map((movie) => (
            <ShowCard
              key={movie.id}
              show={movie}
              onClick={handleMovieClick}
              compact
            />
          ))}
        </div>
      </section>
    </main>
  )
}
