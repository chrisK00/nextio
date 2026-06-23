import { useEffect, useState } from 'react'
import * as api from '../../../services/api'
import type { SearchResults } from "../../../services/apiTypes"

/**
 * Debounced search hook.
 *
 * Fires a TMDb search request 300 ms after the user stops typing.
 * The debounce is implemented via `setTimeout` inside a `useEffect`; the
 * cleanup function (`clearTimeout`) runs whenever `query` changes, cancelling
 * any in-flight timer so we never send a request for an intermediate value.
 *
 * ### Why results persist after the user navigates away
 * `query` comes from the URL (`?q=`) via `useSearchParams` in SearchPage, so
 * pressing Back / Forward in the browser restores the last query and this hook
 * re-runs with the same input, which hits the debounce and re-fetches.
 *
 * @param query The raw (untrimmed) search string, usually bound to an `<input>`.
 */
export default function useSearch(query: string) {
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const trimmedQuery = query.trim()

  useEffect(() => {
    let mounted = true
    if(!trimmedQuery) {
      // TODO
      setResults(null)
      setLoading(false)
      return () => { mounted = false }
    }

    // Debounce: wait 300 ms after the last keystroke before hitting the API.
    const timeout = window.setTimeout(() => {
      void (async () => {
        setLoading(true)
        try {
          const res = await api.searchShows(trimmedQuery)
          if(!mounted) return
          setResults(res)
        } finally {
          if(mounted) setLoading(false)
        }
      })()
    }, 300)

    // Cleanup cancels the timer if the query changes before 300 ms elapse.
    return () => {
      mounted = false
      window.clearTimeout(timeout)
    }
  }, [trimmedQuery])

  return {
    results: trimmedQuery ? results : null,
    loading: trimmedQuery.length > 0 && loading,
  }
}
