import { useEffect, useState } from 'react'
import * as api from '../services/api'
import type { TvShow } from '../services/api'

export default function useShow(id?: string) {
  const [show, setShow] = useState<TvShow | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if(!id) return
    let mounted = true
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const details = await api.getShowDetails(id)
        if(!mounted) return
        setShow(details)
      } catch(e) {
        if(!mounted) return
        setError(e as Error)
      } finally {
        if(mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [id])

  return {
    show, loading, error, refetch: async () => {
      if(!id) return null
      const details = await api.getShowDetails(id)
      setShow(details)
      return details
    }
  }
}
