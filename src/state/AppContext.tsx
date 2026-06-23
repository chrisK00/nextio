/* eslint-disable react-refresh/only-export-components */
/**
 * AppContext — global application state
 *
 * ## What lives here
 * - `tvShows`      – The user's TV library (followed shows with episode progress).
 *                    Loaded once on mount / after login and refreshed after mutations.
 * - `settings`     – UI preferences (dark mode, notifications, genres).
 * - `isLibraryLoaded` – False until the first `/library/tv` response arrives.
 *                       Pages check this before rendering to avoid an empty flash.
 *
 * ## Data flow
 * 1. On mount: `loadSettings()` and `loadLibrary()` fire in parallel via two separate
 *    `useEffect`s. This keeps settings (static) and library (auth-dependent) independent.
 * 2. After login/logout: `token` state changes → `loadLibrary` dependency array re-runs
 *    → the library is re-fetched (or cleared) automatically.
 * 3. Mutations (`toggleEpisode`, `followShow`, etc.) call the API then call `loadLibrary()`
 *    to keep the client in sync with the server. This is intentionally simple over an
 *    optimistic-only approach so the library state always reflects server truth.
 *
 * ## Why `useCallback` everywhere
 * All mutator functions are wrapped in `useCallback` so their identities are stable
 * across re-renders. This prevents child components that receive these as props from
 * re-rendering unnecessarily (the React Compiler handles most of this, but explicit
 * `useCallback` makes the intent clear).
 *
 * ## `watchlistRef` pattern (see useShow.ts)
 * When a callback needs to read the current `tvShows` array without having it as a
 * dependency (which would recreate the callback on every library refresh), we store
 * the latest value in a `useRef`. The ref is updated in a `useEffect` so it is always
 * current, but reading from it inside a callback doesn't add it to that callback's
 * dependency array.
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { ShowMediaType, type Settings } from "../services/apiTypes"
import type { LibraryResponse } from "../services/apiTypes"
import type { LibraryTvShow } from "../services/apiTypes"
import type { TvShow } from "../services/apiTypes"
import * as api from '../services/api'

type WatchlistItem = TvShow & {
  lastUpdatedAt?: string
  lastSyncedAt?: string
  syncError?: string
}

type AppContextType = {
  tvShows: WatchlistItem[]
  settings: Settings | null
  isLoading: boolean
  isLibraryLoaded: boolean
  refresh: () => Promise<void>
  followShow: (show: TvShow) => Promise<void>
  unfollowShow: (showId: string, mediaType?: 'tv' | 'movie') => Promise<void>
  toggleEpisode: (showId: string, season: number, episode: number) => Promise<void>
  toggleSetting: (key: keyof Pick<Settings, 'notificationsEnabled' | 'darkMode'>) => Promise<void>
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
  const [tvShows, setWatchlist] = useState<WatchlistItem[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)
  const [isLibraryLoaded, setIsLibraryLoaded] = useState(false)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [authLoading, setAuthLoading] = useState(false)
  const [username, setUsername] = useState<string | null>(() => localStorage.getItem('username'))

  const applyLibrary = useCallback((library: LibraryResponse<LibraryTvShow>) => {
    setWatchlist(library.items.map(mapLibraryTvShow))
    setIsLibraryLoaded(true)
  }, [])

  const loadLibrary = useCallback(async () => {
    if(!token) {
      // Mark the library as loaded even when signed out so pages can render their empty states.
      setWatchlist([])
      setIsLibraryLoaded(true)
      return
    }
    const library = await api.getLibrary<LibraryTvShow>(ShowMediaType.Tv)
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
      // Load UI settings once at startup; they are independent of auth.
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
      // Library data depends on the auth token, so this re-runs after login/logout.
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

  const followShow = useCallback(async (show: TvShow) => {
    if((show.mediaType ?? 'tv') === 'movie') {
      await api.addLibraryMovie(show)
    } else {
      await api.addLibraryTvShow(show)
      await loadLibrary()
    }
  }, [loadLibrary])

  const unfollowShow = useCallback(async (showId: string, mediaType?: 'tv' | 'movie') => {
    if((mediaType ?? 'tv') === 'movie') {
      await api.removeLibraryMovie(showId)
    } else {
      await api.removeLibraryTvShow(showId)
      await loadLibrary()
    }
  }, [loadLibrary])

  const toggleEpisode = useCallback(async (showId: string, season: number, episode: number) => {
    // TV progress is always saved server-side, then we reload the library so derived state stays in sync.
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
    tvShows,
    settings,
    isLoading: isLoadingSettings,
    isLibraryLoaded: isLibraryLoaded,
    refresh,
    followShow,
    unfollowShow,
    toggleEpisode,
    toggleSetting,
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
  }), [tvShows, settings, isLoadingSettings, isLibraryLoaded, token, username, refresh, followShow, unfollowShow, toggleEpisode, toggleSetting, loadLibrary, authLoading])

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
    releaseDate: item.releaseDate,
    mediaType: 'tv',
    lastUpdatedAt: item.updatedAt,
    lastSyncedAt: item.lastSyncedAt,
    syncError: item.syncError,
  }
}

export default AppContext
