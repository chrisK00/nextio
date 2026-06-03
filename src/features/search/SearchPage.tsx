import { useState } from 'react'
import SearchPanel from './components/SearchPanel'
import type { TvShow } from '../../services/api'
import { useAppContext } from '../../state/AppContext'
import { useNavigate } from 'react-router-dom'
import styles from '../../App.module.css'
import useSearch from './hooks/useSearch'

export default function SearchPage() {
  useAppContext()
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const { results } = useSearch(query)

  const openShow = (show: TvShow) => {
    const encoded = encodeURIComponent(show.id)
    navigate(`/show/${encoded}`)
  }

  return (
    <main>
      <div className={styles.settingsHeader}>
        <button className={styles.secondaryButton} onClick={() => navigate('/unwatched')} type="button">← Back to tracker</button>
      </div>

      <SearchPanel
        searchQuery={query}
        searchResults={results}
        onQueryChange={setQuery}
        onShowClick={openShow}
      />
    </main>
  )
}
