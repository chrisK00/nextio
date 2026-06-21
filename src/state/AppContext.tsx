/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import type { Settings } from "../services/apiTypes"
import type { LibraryResponse } from "../services/apiTypes"
import type { LibraryMovie } from "../services/apiTypes"
import type { LibraryTvShow } from "../services/apiTypes"
import type { TvShow } from "../services/apiTypes"
import * as api from '../services/api'

type WatchlistItem = TvShow & {
  lastUpdatedAt?: string
  lastSyncedAt?: string
  syncError?: string
}

type AppContextType = {
  // lightweight user-owned data
  watchlist: WatchlistItem[]
  tvShows: WatchlistItem[]
  movies: TvShow[]
  settings: Settings | null
  isLoading: boolean
  isLibraryLoaded: boolean
  refresh: () => Promise<void>
  followShow: (show: TvShow) => void
  unfollowShow: (showId: string, mediaType?: 'tv' | 'movie') => void
  toggleEpisode: (showId: string, season: number, episode: number) => Promise<void>
  toggleSetting: (key: keyof Pick<Settings, 'notificationsEnabled' | 'darkMode'>) => Promise<void>
  // auth
  isAuthenticated: boolean
  authLoading: boolean
  username: string | null
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function useAppContext() {
  const ctx = useContext(AppContext)
  if(!ctx) throw new Error('useAppContext must be used within AppProvider')
  return ctx
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  // client-side only state: lightweight watchlist metadata and UI settings
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [movies, setMovies] = useState<TvShow[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)
  const [isLibraryLoaded, setIsLibraryLoaded] = useState(false)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [authLoading, setAuthLoading] = useState(false)
  const [username, setUsername] = useState<string | null>(() => localStorage.getItem('username'))

  const applyLibrary = useCallback((library: LibraryResponse) => {
    setWatchlist(library.tvShows.map(mapLibraryTvShow))
    setMovies(library.movies.map(mapLibraryMovie))
    setIsLibraryLoaded(true)
  }, [])

  const loadLibrary = useCallback(async () => {
    if(!token) {
      setWatchlist([])
      setMovies([])
      setIsLibraryLoaded(true)
      return
    }
    const library = await api.getLibrary()
    applyLibrary(library)
  }, [applyLibrary, token])


  const loadSettings = useCallback(async () => {
    setIsLoadingSettings(true)
    try {
      const appSettings = await api.getAppSettings()
      setSettings(appSettings)
    } finally {
      setIsLoadingSettings(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    void (async () => {
      if(!mounted) return
      await loadSettings()
    })()
    return () => {
      mounted = false
    }
  }, [loadSettings])

  useEffect(() => {
    let mounted = true
    void (async () => {
      if(!mounted) return
      await loadLibrary()
    })()
    return () => {
      mounted = false
    }
  }, [loadLibrary, token])

  // validate token on startup
  useEffect(() => {

    // TODO check if pattern is common
    let mounted = true
    void (async () => {
      if(!token) return
      try {
        setAuthLoading(true)
        await api.getProtectedTest()
      } catch(error: unknown) {
        console.error('Token validation failed:', error)
        // invalid token
        if(!mounted) return
        localStorage.removeItem('token')
        localStorage.removeItem('username')
        setToken(null)
        setUsername(null)
      } finally {
        if(mounted) setAuthLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [token])

  const followShow = useCallback((show: TvShow,) => {
    if((show.mediaType ?? 'tv') === 'movie') {
      void api.addLibraryMovie(show).then(loadLibrary)
    } else {
      void api.addLibraryTvShow(show).then(loadLibrary)
    }
  }, [loadLibrary])

  const unfollowShow = useCallback((showId: string, mediaType?: 'tv' | 'movie') => {
    if((mediaType ?? 'tv') === 'movie') {
      void api.removeLibraryMovie(showId).finally(loadLibrary)
    } else {
      void api.removeLibraryTvShow(showId).finally(loadLibrary)
    }
  }, [loadLibrary])

  const toggleEpisode = useCallback(async (showId: string, season: number, episode: number) => {
    await api.setLibraryEpisodeWatched(showId, season, episode)
    await loadLibrary()
  }, [loadLibrary])

  const refresh = useCallback(async () => {
    await Promise.all([loadSettings(), loadLibrary()])
  }, [loadSettings, loadLibrary])

  const toggleSetting = useCallback(async (key: keyof Pick<Settings, 'notificationsEnabled' | 'darkMode'>) => {
    if(!settings) return
    const updated = { ...settings, [key]: !settings[key] }
    const saved = await api.saveAppSettings(updated)
    setSettings(saved)
  }, [settings])

  const value: AppContextType = useMemo(() => ({
    watchlist,
    tvShows: watchlist.filter((item) => item.mediaType !== 'movie'),
    movies,
    settings,
    isLoading: isLoadingSettings,
    isLibraryLoaded: isLibraryLoaded,
    refresh,
    followShow,
    unfollowShow,
    toggleEpisode,
    toggleSetting,
    // auth
    isAuthenticated: !!token,
    authLoading: authLoading,
    username,
    login: async (username: string, password: string) => {
      setAuthLoading(true)
      try {
        const res = await api.authLogin(username, password)
        localStorage.setItem('token', res.token)
        localStorage.setItem('username', username)
        setToken(res.token)
        setUsername(username)
        await loadLibrary()
      } finally { setAuthLoading(false) }
    },
    register: async (username: string, password: string) => {
      setAuthLoading(true)
      try {
        const res = await api.authRegister(username, password)
        localStorage.setItem('token', res.token)
        localStorage.setItem('username', username)
        setToken(res.token)
        setUsername(username)
        await loadLibrary()
      } finally { setAuthLoading(false) }
    },

    logout: () => {
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      setToken(null)
      setUsername(null)
    }
  }), [watchlist, movies, settings, isLoadingSettings, isLibraryLoaded, token, username, refresh, followShow, unfollowShow, toggleEpisode, toggleSetting, loadLibrary, authLoading])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

function mapLibraryTvShow(item: LibraryTvShow): WatchlistItem {
  return {
    id: item.id,
    title: item.title,
    posterUrl: item.posterUrl,
    status: item.status ?? 'Tracked',
    episodesWatched: item.episodes.filter((episode) => episode.watched).length,
    episodesTotal: Math.max(item.episodes.length, 1),
    nextAiringEpisode: item.nextAiringEpisode,
    nextUserEpisode: item.nextUserEpisode,
    description: item.description ?? item.title,
    mediaType: 'tv',
    lastUpdatedAt: item.updatedAt,
    lastSyncedAt: item.lastSyncedAt,
    syncError: item.syncError,
  }
}

function mapLibraryMovie(item: LibraryMovie): TvShow {
  return {
    id: item.id,
    title: item.title,
    mediaType: 'movie',
    status: 'Watched',
    episodesWatched: 1,
    episodesTotal: 1,
    description: item.description ?? item.title,
    posterUrl: item.posterUrl,
  }
}

export default AppContext
