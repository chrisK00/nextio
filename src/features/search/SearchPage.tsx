import { useMemo, useState } from 'react'
import SearchPanel from './components/SearchPanel'
import type { TvShow } from "../../services/apiTypes"
import { useAppContext } from '../../state/AppContext'
import { useNavigate, useSearchParams } from 'react-router-dom'
import styles from '../../App.module.css'
import useSearch from './hooks/useSearch'
import useGenreFilter from '../../hooks/useGenreFilter'

export default function SearchPage() {
  useAppContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const nextQuery = searchParams.get('q') ?? ''
  const [query, setQuery] = useState(nextQuery)
  const [prevNextQuery, setPrevNextQuery] = useState(nextQuery)

  if (nextQuery !== prevNextQuery) {
    setPrevNextQuery(nextQuery)
    setQuery(nextQuery)
  }

  const { results, loading } = useSearch(query) 
  const allResults = useMemo(() => [...(results?.tvShows ?? []), ...(results?.movies ?? [])], [results])
  const { genres, counts, filter } = useGenreFilter(allResults)
  const [genre, setGenre] = useState('')
  const filteredResults = useMemo(() => {
    const filtered = new Set(filter('', genre).map((show) => show.id))
    return results ? { tvShows: results.tvShows.filter((show) => filtered.has(show.id)), movies: results.movies.filter((show) => filtered.has(show.id)) } : null
  }, [results, filter, genre])

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
        searchResults={filteredResults}
        isLoading={loading}
        onQueryChange={updateQuery}
        onShowClick={openShow}
        genres={genres}
        genreCounts={counts}
        genre={genre}
        onGenreChange={setGenre}
      />
    </main>
  )
}
