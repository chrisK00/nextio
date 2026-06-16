import { useNavigate } from 'react-router-dom'
import type { TvShow } from "../../../services/apiTypes"
import ShowCard from '../../show/components/ShowCard'
import styles from '../../../App.module.css'
import { useAppContext } from '../../../state/AppContext'

export default function MoviesPage() {
  const navigate = useNavigate()
  const { movies } = useAppContext()

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
