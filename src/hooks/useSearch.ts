import { useEffect, useState } from 'react'
import * as api from '../services/api'
import type { TvShow } from '../services/api'

export default function useSearch(query: string) {
  const [results, setResults] = useState<TvShow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    if(!query.trim()) {
      void Promise.resolve().then(() => { if(mounted) setResults([]) })
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
  }, [query])

  return { results, loading }
}
