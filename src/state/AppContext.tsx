/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import type { TvShow, Settings } from '../services/api'
import * as api from '../services/api'

type WatchlistItem = { id: string; title?: string; posterUrl?: string; lastUpdatedAt?: string }

type AppContextType = {
  // lightweight user-owned data
  watchlist: WatchlistItem[]
  settings: Settings | null
  isLoading: boolean
  refresh: () => Promise<void>
  followShow: (show: TvShow) => void
  unfollowShow: (showId: string) => void
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
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [authLoading, setAuthLoading] = useState(false)
  const [username, setUsername] = useState<string | null>(() => localStorage.getItem('username'))

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

  // validate token on startup
  useEffect(() => {
    let mounted = true
    void (async () => {
      if(!token) return
      try {
        setAuthLoading(true)
        await api.getProtectedTest()
      } catch {
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

  const followShow = useCallback((show: TvShow) => {
    const now = new Date().toISOString()
    setWatchlist((prev) => {
      if(prev.some((s) => s.id === show.id)) return prev
      return [...prev, { id: show.id, title: show.title, posterUrl: show.posterUrl, lastUpdatedAt: now }]
    })
  }, [])

  const unfollowShow = useCallback((showId: string) => {
    setWatchlist((prev) => prev.filter((item) => item.id !== showId))
  }, [])

  const toggleEpisode = useCallback(async (showId: string, season: number, episode: number) => {
    await api.toggleEpisodeWatched(showId, season, episode)
    const now = new Date().toISOString()
    setWatchlist((prev) => {
      const index = prev.findIndex((item) => item.id === showId)
      if(index >= 0) {
        const next = [...prev]
        next[index] = { ...next[index], lastUpdatedAt: now }
        return next
      }
      return prev
    })
  }, [])

  const toggleSetting = useCallback(async (key: keyof Pick<Settings, 'notificationsEnabled' | 'darkMode'>) => {
    if(!settings) return
    const updated = { ...settings, [key]: !settings[key] }
    const saved = await api.saveAppSettings(updated)
    setSettings(saved)
  }, [settings])

  const value: AppContextType = useMemo(() => ({
    watchlist,
    settings,
    isLoading: isLoadingSettings,
    refresh: loadSettings,
    followShow,
    unfollowShow,
    toggleEpisode,
    toggleSetting,
    // auth
    isAuthenticated: !!token,
    authLoading: authLoading,
    username,
    login: async (u: string, p: string) => {
      setAuthLoading(true)
      try {
        const res = await api.authLogin(u, p)
        localStorage.setItem('token', res.token)
        localStorage.setItem('username', u)
        setToken(res.token)
        setUsername(u)
      } finally { setAuthLoading(false) }
    },
    register: async (u: string, p: string) => {
      setAuthLoading(true)
      try {
        const res = await api.authRegister(u, p)
        localStorage.setItem('token', res.token)
        localStorage.setItem('username', u)
        setToken(res.token)
        setUsername(u)
      } finally { setAuthLoading(false) }
    },
    logout: () => {
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      setToken(null)
      setUsername(null)
    }
  }), [watchlist, settings, isLoadingSettings, loadSettings, followShow, unfollowShow, toggleEpisode, toggleSetting])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export default AppContext
