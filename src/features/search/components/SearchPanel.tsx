import type { SearchResults } from "../../../services/apiTypes"
import type { TvShow } from "../../../services/apiTypes"
import ShowCard from '../../show/components/ShowCard'
import styles from '../../../App.module.css'
import GenreSelect from '../../../components/common/GenreSelect'

type SearchPanelProps = {
  searchQuery: string
  searchResults: SearchResults | null
  isLoading?: boolean
  onQueryChange: (value: string) => void
  onShowClick?: (show: TvShow) => void
  genres?: string[]
  genreCounts?: Record<string, number>
  genre?: string
  onGenreChange?: (value: string) => void
}

export default function SearchPanel({ searchQuery, searchResults, isLoading = false, onQueryChange, onShowClick, genres = [], genre = '', genreCounts = {}, onGenreChange }: SearchPanelProps) {
  const tvShows = searchResults?.tvShows ?? []
  const movies = searchResults?.movies ?? []
  const hasResults = tvShows.length > 0 || movies.length > 0

  return (
    <section className={styles.searchPanel}>
      <div className={styles.searchField}>
        <div className={styles.globalSearchInputWrap}>
          <input
            id="show-search"
            value={searchQuery}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search TV shows or movies"
          />
          {searchQuery && <button className={styles.globalSearchClear} onClick={() => onQueryChange('')} type="button" aria-label="Clear search">✕</button>}
        </div>
        {onGenreChange && <GenreSelect genres={genres} counts={genreCounts} value={genre} onChange={onGenreChange} />}
      </div>

      <div className={styles.searchResults}>
        {searchQuery.trim().length === 0 && !isLoading && !hasResults && (
          <div className={styles.emptyState}>No trending shows found right now.</div>
        )}

        {searchQuery.trim().length === 0 && hasResults && (
          <div className={styles.searchSection}>
            <h2 className={styles.searchSectionTitle}>Trending this week</h2>
          </div>
        )}

        {isLoading && (
          <div className={styles.loadingBar} />
        )}

        {searchQuery.trim().length > 0 && searchResults !== null && !hasResults && (
          <div className={styles.emptyState}>No shows found for "{searchQuery}". Try another keyword.</div>
        )}

        {tvShows.length > 0 && (
          <div className={styles.searchSection}>
            <h2 className={styles.searchSectionTitle}>TV Shows</h2>
            <div className={styles.showGrid}>
              {tvShows.map((show) => (
                <ShowCard key={show.id} show={show} onClick={onShowClick} showReleaseDate />
              ))}
            </div>
          </div>
        )}

        {movies.length > 0 && (
          <div className={styles.searchSection}>
            <h2 className={styles.searchSectionTitle}>Movies</h2>
            <div className={styles.showGrid}>
              {movies.map((show) => (
                <ShowCard key={show.id} show={show} onClick={onShowClick} showReleaseDate />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
