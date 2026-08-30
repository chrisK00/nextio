import { useCallback, useEffect, useMemo, useState } from 'react'
import type { TvShow } from '../services/apiTypes'
import { getShowDetails } from '../services/api'

const genreCache = new Map<string, string[]>()
const genreRequests = new Map<string, Promise<string[]>>()

async function getGenres(item: TvShow): Promise<string[]> {
  if (item.genres) {
    genreCache.set(item.id, item.genres)
    return item.genres
  }
  const cached = genreCache.get(item.id)
  if (cached) return cached
  const existingRequest = genreRequests.get(item.id)
  if (existingRequest) return existingRequest
  const request = getShowDetails(item.id).then((details) => {
    const genres = details?.genres ?? []
    genreCache.set(item.id, genres)
    genreRequests.delete(item.id)
    return genres
  })
  genreRequests.set(item.id, request)
  return request
}

export default function useGenreFilter(items: TvShow[]) {
  const [genresById, setGenresById] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    setLoading(items.length > 0)
    void Promise.all(items.map(async (item) => [item.id, await getGenres(item)] as const)).then((entries) => {
      if (active) { setGenresById(Object.fromEntries(entries)); setLoading(false) }
    })
    return () => { active = false }
  }, [items])
  const genres = useMemo(() => [...new Set(items.flatMap((item) => genresById[item.id] ?? item.genres ?? []))].sort(), [items, genresById])
  const counts = useMemo(() => Object.fromEntries(genres.map((genre) => [genre, items.filter((item) => (genresById[item.id] ?? item.genres ?? []).includes(genre)).length])), [genres, items, genresById])
  const filter = useCallback((query: string, genre: string) => items.filter((item) => item.title.toLowerCase().includes(query.toLowerCase().trim()) && (!genre || (genresById[item.id] ?? item.genres ?? []).includes(genre))), [items, genresById])
  return { genres, counts, loading, filter }
}
