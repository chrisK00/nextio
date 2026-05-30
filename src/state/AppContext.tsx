/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import type { TvShow, Settings } from '../services/api'
import * as api from '../services/api'

type WatchlistItem = { id: string; title?: string; posterUrl?: string }

type AppContextType = {
  // lightweight user-owned data
  watchlist: WatchlistItem[]
  settings: Settings | null
  isLoading: boolean
  refresh: () => Promise<void>
  addShow: (show: TvShow) => void
  toggleEpisode: (showId: string, season: number, episode: number) => Promise<void>
  toggleSetting: (key: keyof Pick<Settings, 'notificationsEnabled' | 'darkMode'>) => Promise<void>
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

  const addShow = useCallback((show: TvShow) => {
    setWatchlist((prev) => (prev.some((s) => s.id === show.id) ? prev : [...prev, { id: show.id, title: show.title, posterUrl: show.posterUrl }]))
  }, [])

  const toggleEpisode = useCallback(async (showId: string, season: number, episode: number) => {
    await api.toggleEpisodeWatched(showId, season, episode)
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
    addShow,
    toggleEpisode,
    toggleSetting,
  }), [watchlist, settings, isLoadingSettings, loadSettings, addShow, toggleEpisode, toggleSetting])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export default AppContext
