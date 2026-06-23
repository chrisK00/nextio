import { useEffect, useState } from 'react'
import SearchPanel from './components/SearchPanel'
import type { TvShow } from "../../services/apiTypes"
import { useAppContext } from '../../state/AppContext'
import { useNavigate, useSearchParams } from 'react-router-dom'
import styles from '../../App.module.css'
import useSearch from './hooks/useSearch'

export default function SearchPage() {
  useAppContext()
  const [searchParams, setSearchParams] = useSearchParams()
  // Query lives in the URL so browser back/forward restores the last search.
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const navigate = useNavigate()
  const { results, loading } = useSearch(query)

/*
// TODO Error: Calling setState synchronously within an effect can trigger cascading renders
effects run after render
updating state triggers another render
this can cause render → effect → setState → render → effect → setState loops
*/
const nextQuery = searchParams.get('q') ?? ''
  useEffect(() => {
    // Keep local input state aligned with URL navigation.
    setQuery((current) => current === nextQuery ? current : nextQuery)
  }, [nextQuery]) 

  const updateQuery = (value: string) => {
    setQuery(value)
    const params = new URLSearchParams(searchParams)
    if(value.trim()) {
      params.set('q', value)
    } else {
      params.delete('q')
    }
    setSearchParams(params, { replace: true })
  }

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
        isLoading={loading}
        onQueryChange={updateQuery}
        onShowClick={openShow}
      />
    </main>
  )
}
