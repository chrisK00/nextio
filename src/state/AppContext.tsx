/* eslint-disable react-refresh/only-export-components */
/**
 * AppContext — global application state
 *
 * ## What lives here
 * - `tvShows`      – The user's TV library (followed shows with episode progress).
 *                    Restored from IndexedDB when available, then refreshed from the API.
 * - `settings`     – UI preferences (dark mode, notifications, genres).
 * - `isLibraryLoaded` – False until cached or server library data is available.
 *                       Pages check this before rendering to avoid an empty flash.
 *
 * ## Data flow
 * 1. On mount: `loadSettings()` and `loadLibrary()` fire in parallel via two separate
 *    `useEffect`s. This keeps settings (static) and library (auth-dependent) independent.
 * 2. After login/logout: `token` state changes → `loadLibrary` restores that user's cache,
 *    refreshes from the API, or clears the in-memory library on logout.
 * 3. Mutations (`toggleEpisode`, `followShow`, etc.) call the API then call `loadLibrary()`
 *    to keep the client in sync with the server and refresh its offline snapshot. This
 *    avoids treating unconfirmed offline mutations as server-saved progress.
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
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { ShowMediaType, type Settings } from "../services/apiTypes"
import type { LibraryResponse } from "../services/apiTypes"
import type { LibraryTvShow } from "../services/apiTypes"
import type { TvShow } from "../services/apiTypes"
import * as api from '../services/api'
import { deleteCachedLibrary, readCachedLibrary, writeCachedLibrary } from '../services/libraryCache'

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
  libraryError: string | null
  libraryIsStale: boolean
  libraryIsRefreshing: boolean
  libraryLastUpdatedAt: string | null
  isOnline: boolean
  refresh: () => Promise<void>
  followShow: (show: TvShow) => Promise<void>
  unfollowShow: (showId: string, mediaType?: 'tv' | 'movie') => Promise<void>
  toggleEpisode: (showId: string, season: number, episode: number) => Promise<void>
  toggleSetting: (key: keyof Pick<Settings, 'notificationsEnabled' | 'darkMode' | 'nsfwEnabled'>) => Promise<void>
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>
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
  const [libraryError, setLibraryError] = useState<string | null>(null)
  const [libraryIsStale, setLibraryIsStale] = useState(false)
  const [libraryIsRefreshing, setLibraryIsRefreshing] = useState(false)
  const [libraryLastUpdatedAt, setLibraryLastUpdatedAt] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [username, setUsername] = useState<string | null>(() => localStorage.getItem('username'))
  const [authLoading, setAuthLoading] = useState(() => !localStorage.getItem('token') && Boolean(localStorage.getItem('username')))
  const [offlineAuthenticated, setOfflineAuthenticated] = useState(false)
  const libraryRequestId = useRef(0)
  const libraryHasData = useRef(false)

  const applyLibrary = useCallback((library: LibraryResponse<LibraryTvShow>) => {
    setWatchlist(library.items.map(mapLibraryTvShow))
    libraryHasData.current = true
    setIsLibraryLoaded(true)
  }, [])

  const loadLibrary = useCallback(async () => {
    const requestId = ++libraryRequestId.current
    const isCurrentRequest = () => requestId === libraryRequestId.current
    const cacheUsername = username?.trim() ?? ''
    if(!token) {
      let cached = null
      if(cacheUsername) {
        cached = await readCachedLibrary(cacheUsername).catch((error: unknown) => {
          console.warn('Could not read the saved library for offline access:', error)
          return null
        })
      }
      if(!isCurrentRequest()) {
        return
      }
      if(cached) {
        applyLibrary(cached.library)
        setLibraryIsStale(true)
        setLibraryLastUpdatedAt(cached.cachedAt)
        setOfflineAuthenticated(true)
      } else {
        setWatchlist([])
        libraryHasData.current = false
        setLibraryIsStale(false)
        setLibraryLastUpdatedAt(null)
        setOfflineAuthenticated(false)
      }
      setLibraryError(null)
      setLibraryIsRefreshing(false)
      setIsLibraryLoaded(true)
      setAuthLoading(false)
      return
    }

    setOfflineAuthenticated(false)
    setLibraryIsRefreshing(true)
    setLibraryError(null)

    const cachedLibraryPromise = cacheUsername
      ? readCachedLibrary(cacheUsername).catch((error: unknown) => {
        console.warn('Could not read the saved library:', error)
        return null
      })
      : Promise.resolve(null)
    let hasCachedLibrary = false
    try {
      const cached = await cachedLibraryPromise
      if(!isCurrentRequest()) {
        return
      }
      if(cached) {
        hasCachedLibrary = true
        applyLibrary(cached.library)
        setLibraryIsStale(true)
        setLibraryLastUpdatedAt(cached.cachedAt)
      }

      if(!navigator.onLine) {
        if(cached) {
          setOfflineAuthenticated(true)
        }
        setLibraryIsRefreshing(false)
        setIsLibraryLoaded(true)
        return
      }

      const networkLibraryPromise = api.getLibrary<LibraryTvShow>(ShowMediaType.Tv).then(
        (library) => ({ library } as const),
        (error: unknown) => ({ error } as const),
      )

      const result = await networkLibraryPromise
      if(!isCurrentRequest()) {
        return
      }
      if('error' in result) {
        throw result.error
      }

      if(result.library.items.length === 0 && cached && cached.library.items.length > 0) {
        setLibraryIsStale(true)
        setLibraryLastUpdatedAt(cached.cachedAt)
        setIsLibraryLoaded(true)
        return
      }

      applyLibrary(result.library)
      setLibraryIsStale(false)
      setLibraryLastUpdatedAt(new Date().toISOString())
      setLibraryError(null)
      if(cacheUsername) {
        void writeCachedLibrary(cacheUsername, result.library).catch((error: unknown) => {
          console.warn('Could not save the library for offline use:', error)
        })
      }
    } catch(error: unknown) {
      if(!isCurrentRequest()) {
        return
      }
      console.error('Failed to load library:', error)
      if(hasCachedLibrary || libraryHasData.current) {
        if(hasCachedLibrary) {
          const cached = await readCachedLibrary(cacheUsername).catch(() => null)
          if(cached && isCurrentRequest()) {
            applyLibrary(cached.library)
            setLibraryLastUpdatedAt(cached.cachedAt)
          }
        }
        setLibraryIsStale(true)
        setLibraryError(null)
      } else {
        setLibraryError(error instanceof Error ? error.message : 'Could not load your library.')
      }
      setIsLibraryLoaded(true)
    } finally {
      if(isCurrentRequest()) {
        setLibraryIsRefreshing(false)
      }
    }
  }, [applyLibrary, token, username])


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

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if(token) {
        void loadLibrary()
      } else if(offlineAuthenticated && localStorage.getItem('refreshToken')) {
        void api.getProtectedTest().then(() => {
          const refreshedToken = localStorage.getItem('token')
          if(refreshedToken) {
            setToken(refreshedToken)
            setOfflineAuthenticated(false)
          }
        }).catch((error: unknown) => {
          console.warn('Could not restore the online session:', error)
        })
      }
    }
    const handleOffline = () => {
      setIsOnline(false)
      if(!token) {
        void loadLibrary()
      }
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [loadLibrary, offlineAuthenticated, token])

  useEffect(() => {
    const handleAuthExpired = () => {
      libraryRequestId.current++
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('diagnosticsToken')
      setToken(null)
      setWatchlist([])
      libraryHasData.current = false
      setOfflineAuthenticated(false)
      setLibraryIsStale(false)
      setLibraryIsRefreshing(false)
      setLibraryLastUpdatedAt(null)
      setLibraryError(null)
      setIsLibraryLoaded(true)
    }

    window.addEventListener('nextio:auth-expired', handleAuthExpired)
    return () => window.removeEventListener('nextio:auth-expired', handleAuthExpired)
  }, [])

  // validate token on startup
  useEffect(() => {

    let mounted = true
    void (async () => {
      if(!token && (!navigator.onLine || !localStorage.getItem('refreshToken'))) return
      try {
        setAuthLoading(true)
        await api.getProtectedTest()
        const refreshedToken = localStorage.getItem('token')
        if(refreshedToken && refreshedToken !== token) {
          setToken(refreshedToken)
          setOfflineAuthenticated(false)
        }
      } catch(error: unknown) {
        if(error instanceof api.AuthExpiredError) {
          if(!mounted) return
          if(localStorage.getItem('token') !== token) return
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('diagnosticsToken')
          setToken(null)
          setOfflineAuthenticated(false)
        } else {
          // Keep the saved session when startup validation fails because of a temporary network issue.
          console.warn('Token validation could not reach the server:', error)
        }
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

  const toggleSetting = useCallback(async (key: keyof Pick<Settings, 'notificationsEnabled' | 'darkMode' | 'nsfwEnabled'>) => {
    if(!settings) return
    const updated = { ...settings, [key]: !settings[key] }
    const saved = await api.saveAppSettings(updated)
    setSettings(saved)
  }, [settings])

  const updateSetting = useCallback(async <K extends keyof Settings>(key: K, value: Settings[K]) => {
    if(!settings) return
    const updated = { ...settings, [key]: value }
    const saved = await api.saveAppSettings(updated)
    setSettings(saved)
  }, [settings])

  const value: AppContextType = useMemo(() => ({
    tvShows,
    settings,
    isLoading: isLoadingSettings,
    isLibraryLoaded: isLibraryLoaded,
    libraryError,
    libraryIsStale,
    libraryIsRefreshing,
    libraryLastUpdatedAt,
    isOnline,
    refresh,
    followShow,
    unfollowShow,
    toggleEpisode,
    toggleSetting,
    updateSetting,
    isAuthenticated: !!token || offlineAuthenticated,
    authLoading: authLoading,
    username,
    login: async (username: string, password: string) => {
      setAuthLoading(true)
      libraryRequestId.current++
      api.invalidateAuthRequests()
      try {
        const res = await api.authLogin(username, password)
        localStorage.setItem('token', res.token)
        localStorage.setItem('username', username)
        if(res.refreshToken) {
          localStorage.setItem('refreshToken', res.refreshToken)
        } else {
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('diagnosticsToken')
        }
        setIsLibraryLoaded(false)
        libraryHasData.current = false
        setLibraryError(null)
        setLibraryIsStale(false)
        setLibraryLastUpdatedAt(null)
        setOfflineAuthenticated(false)
        setToken(res.token)
        setUsername(username)
      } finally { setAuthLoading(false) }
    },
    register: async (username: string, password: string) => {
      setAuthLoading(true)
      libraryRequestId.current++
      api.invalidateAuthRequests()
      try {
        const res = await api.authRegister(username, password)
        localStorage.setItem('token', res.token)
        localStorage.setItem('username', username)
        if(res.refreshToken) {
          localStorage.setItem('refreshToken', res.refreshToken)
        } else {
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('diagnosticsToken')
        }
        setIsLibraryLoaded(false)
        libraryHasData.current = false
        setLibraryError(null)
        setLibraryIsStale(false)
        setLibraryLastUpdatedAt(null)
        setOfflineAuthenticated(false)
        setToken(res.token)
        setUsername(username)
      } finally { setAuthLoading(false) }
    },

    logout: () => {
      libraryRequestId.current++
      api.invalidateAuthRequests()
      if(username) {
        void deleteCachedLibrary(username).catch((error: unknown) => {
          console.warn('Could not clear the saved library during logout:', error)
        })
      }
      void api.authLogout().catch((error: unknown) => {
        console.warn('Failed to revoke the refresh token during logout:', error)
      })
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('diagnosticsToken')
      setToken(null)
      setUsername(null)
      setOfflineAuthenticated(false)
      setWatchlist([])
      libraryHasData.current = false
      setLibraryError(null)
      setLibraryIsStale(false)
      setLibraryIsRefreshing(false)
      setLibraryLastUpdatedAt(null)
      setIsLibraryLoaded(true)
    }
  }), [tvShows, settings, isLoadingSettings, isLibraryLoaded, libraryError, libraryIsStale, libraryIsRefreshing, libraryLastUpdatedAt, isOnline, token, offlineAuthenticated, username, refresh, followShow, unfollowShow, toggleEpisode, toggleSetting, updateSetting, authLoading])

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
