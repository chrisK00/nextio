import type { SearchResults } from "../../../services/apiTypes"
import type { TvShow } from "../../../services/apiTypes"
import ShowCard from '../../show/components/ShowCard'
import styles from '../../../App.module.css'

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
        <label htmlFor="show-search">Find shows to add</label>
        <div className={styles.globalSearchInputWrap}>
          <input
            id="show-search"
            value={searchQuery}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search TV shows or movies"
          />
          {searchQuery && <button className={styles.globalSearchClear} onClick={() => onQueryChange('')} type="button" aria-label="Clear search">✕</button>}
        </div>
        {onGenreChange && <select className={styles.genreSelect} value={genre} onChange={(event) => onGenreChange(event.target.value)} aria-label="Filter by genre">
          <option value="">All genres</option>{genres.map((itemGenre) => <option key={itemGenre} value={itemGenre}>{itemGenre} ({genreCounts[itemGenre] ?? 0})</option>)}
        </select>}
      </div>

      <div className={styles.searchResults}>
        {searchQuery.trim().length === 0 && (
          <div className={styles.emptyState}>Enter a search term to discover shows.</div>
        )}

        {isLoading && searchQuery.trim().length > 0 && (
          <div className={styles.loadingBar} />
        )}

        {searchResults !== null && !hasResults && (
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
