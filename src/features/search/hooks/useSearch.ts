import { useEffect, useState } from 'react'
import * as api from '../../../services/api'
import type { SearchResults } from "../../../services/apiTypes"

export default function useSearch(query: string) {
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const trimmedQuery = query.trim()

  useEffect(() => {
    let mounted = true
    if(!trimmedQuery) {
      return () => { mounted = false }
    }

    void (async () => {
      setLoading(true)
      try {
        const res = await api.searchShows(query)
        if(!mounted) return
        setResults(res)
      } finally {
        if(mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [query, trimmedQuery])

  return {
    results: trimmedQuery ? results : null,
    loading: trimmedQuery.length > 0 && loading,
  }
}
