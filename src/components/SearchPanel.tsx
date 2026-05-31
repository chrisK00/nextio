import type { TvShow } from '../services/api'
import ShowCard from './ShowCard'
import styles from '../App.module.css'

type SearchPanelProps = {
  searchQuery: string
  searchResults: TvShow[]
  onQueryChange: (value: string) => void
  onShowClick?: (show: TvShow) => void
}

export default function SearchPanel({ searchQuery, searchResults, onQueryChange, onShowClick }: SearchPanelProps) {
  return (
    <section className={styles.searchPanel}>
      <div className={styles.searchField}>
        <label htmlFor="show-search">Find shows to add</label>
        <input
          id="show-search"
          value={searchQuery}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search by show title or network"
        />
      </div>

      <div className={styles.searchResults}>
        {searchQuery.trim().length === 0 && (
          <div className={styles.emptyState}>Enter a search term to discover shows.</div>
        )}
        {searchQuery.trim().length > 0 && searchResults.length === 0 && (
          <div className={styles.emptyState}>No shows found for “{searchQuery}”. Try another keyword.</div>
        )}

        {searchResults.length > 0 && (
          <div className={styles.showGrid}>
            {searchResults.map((show) => (
              <ShowCard key={show.id} show={show} onClick={onShowClick} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
