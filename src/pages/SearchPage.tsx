import { useState } from 'react'
import SearchPanel from '../components/SearchPanel'
import { useAppContext } from '../state/AppContext'
import { useNavigate } from 'react-router-dom'
import styles from '../App.module.css'
import useSearch from '../hooks/useSearch'

export default function SearchPage() {
  const { addShow } = useAppContext()
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const { results } = useSearch(query)

  return (
    <main>
      <div className={styles.settingsHeader}>
        <button className={styles.secondaryButton} onClick={() => navigate('/')} type="button">← Back to tracker</button>
      </div>

      <SearchPanel
        searchQuery={query}
        searchResults={results}
        onQueryChange={setQuery}
        onAddShow={(s) => addShow(s)}
      />
    </main>
  )
}
