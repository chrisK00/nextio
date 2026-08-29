import { useState, useEffect } from 'react'
import { useAppContext } from '../../state/AppContext'
import { useNavigate } from 'react-router-dom'
import styles from './SettingsPage.module.css'
import appStyles from '../../App.module.css'
import * as api from '../../services/api'
import type { LibrarySyncResponse, LibrarySyncItem, TvShow, LibraryMovie } from '../../services/apiTypes'
import { ShowMediaType } from '../../services/apiTypes'

export default function SettingsPage() {
  const { settings, toggleSetting, updateSetting, tvShows, refresh } = useAppContext()
  const navigate = useNavigate()
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncResult, setSyncResult] = useState<LibrarySyncResponse | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [stats, setStats] = useState<import('../../services/apiTypes').LibraryStats | null>(null)

  useEffect(() => {
    api.getLibraryStats().then(setStats)
  }, [])

  const handleSync = async (throwOnFailure = false): Promise<LibrarySyncResponse | null> => {
    setSyncLoading(true)
    setSyncError(null)
    try {
      const result = await api.syncLibrary()
      setSyncResult(result)
      await refresh()
      const nextStats = await api.getLibraryStats()
      setStats(nextStats)
      if (throwOnFailure && result.failed > 0) {
        throw new Error(`Metadata sync failed for ${result.failed} of ${result.total} shows.`)
      }
      return result
    } catch(error) {
      setSyncError(error instanceof Error ? error.message : 'Sync failed')
      if (throwOnFailure) throw error
      return null
    } finally {
      setSyncLoading(false)
    }
  }

  const [exportLoading, setExportLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)

  type ExportEpisode = { season: number; episode: number; watched: boolean; }
  type ExportShow = { id: string; title: string; status?: string; episodes: ExportEpisode[], posterUrl: string }
  type ExportMovie = { id: string; title: string; posterUrl?: string, releaseDate?: string, watched?: boolean }
  type ExportFile = { tvShows: ExportShow[]; movies: ExportMovie[] }

  const handleExport = async (format: 'json' | 'couchmoney-csv' | 'letterboxd-csv' = 'json') => {
    setExportLoading(true)
    try {
      const [tvDetails, movieLibrary] = await Promise.all([
        Promise.all(tvShows.map((s) => api.getLibraryTvShow(s.id))),
        api.getLibrary<LibraryMovie>(ShowMediaType.Movie),
      ])

      const dateStr = new Date().toISOString().slice(0, 10)

      if (format === 'letterboxd-csv') {
        // Letterboxd format: Title,Year,WatchedDate
        let csv = 'Title,Year\n'
        for (const movie of movieLibrary.items) {
          const year = movie.releaseDate ? movie.releaseDate.slice(0, 4) : ''
          const escapedTitle = `"${movie.title.replace(/"/g, '""')}"`
          csv += `${escapedTitle},${year}\n`
        }
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `nextio-letterboxd-${dateStr}.csv`
        a.click()
        URL.revokeObjectURL(url)
        api.recordLibraryExport(localStorage.getItem('username'))
        return
      }

      if (format === 'couchmoney-csv') {
        // Trakt / Couchmoney compatible history: tmdb_id,title,type,watched
        let csv = 'tmdb_id,title,type,watched\n'
        for (const m of movieLibrary.items) {
          const rawId = m.id.includes(':') ? m.id.split(':')[1] : m.id
          const title = `"${m.title.replace(/"/g, '""')}"`
          csv += `${rawId},${title},movie,${m.watched ? 1 : 0}\n`
        }
        for (const show of tvDetails.filter(Boolean)) {
          const rawId = show!.show.id.includes(':') ? show!.show.id.split(':')[1] : show!.show.id
          const title = `"${show!.show.title.replace(/"/g, '""')}"`
          const hasWatchedEp = show!.episodes.some(e => e.watched)
          csv += `${rawId},${title},show,${hasWatchedEp ? 1 : 0}\n`
        }
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `nextio-recommendations-${dateStr}.csv`
        a.click()
        URL.revokeObjectURL(url)
        api.recordLibraryExport(localStorage.getItem('username'))
        return
      }

      const data = {
        exportedAt: new Date().toISOString(),
        totalShows: tvDetails.length,
        totalMovies: movieLibrary.items.length,
        tvShows: tvDetails.filter(Boolean).map((d) => ({
          id: d!.show.id,
          title: d!.show.title,
          status: d!.show.status,
          posterUrl: d!.show.posterUrl,
          episodes: d!.episodes.map((e) => ({ season: e.season, episode: e.episode, watched: e.watched })),
        })),
        movies: movieLibrary.items.map((m) => ({ id: m.id, title: m.title, posterUrl: m.posterUrl, releaseDate: m.releaseDate, watched: m.watched })),
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nextio-export-${dateStr}.json`
      a.click()
      URL.revokeObjectURL(url)
      api.recordLibraryExport(localStorage.getItem('username'))
    } finally {
      setExportLoading(false)
    }
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if(!file) return
      setImportLoading(true)
      setImportResult(null)
      try {
        const text = await file.text()
        const data = JSON.parse(text) as ExportFile
        let tvCount = 0, movieCount = 0

        const waitForSyncMessage = '(NA)'
        for(const show of data.tvShows ?? []) {

          const showToAdd: TvShow = {
            id: show.id, title: show.title, mediaType: 'tv', status: waitForSyncMessage, description: waitForSyncMessage,
            episodesTotal: 0, episodesWatched: 0, posterUrl: show.posterUrl, seasons: []
          }

          await api.addLibraryTvShow(showToAdd)
          const watchedEpisodes = show.episodes?.filter((e) => e.watched) ?? []
          if(watchedEpisodes.length > 0) {
            await api.setLibraryEpisodesWatchedBulk(show.id, watchedEpisodes.map(ep => ({ season: ep.season, episode: ep.episode, watched: true })))
          }
          tvCount++
        }

        for(const movie of data.movies ?? []) {
          await api.addLibraryMovie({ id: movie.id, title: movie.title, mediaType: 'movie', posterUrl: movie.posterUrl, releaseDate: movie.releaseDate, status: waitForSyncMessage, episodesWatched: 0, episodesTotal: 0, description: waitForSyncMessage })
          if(movie.watched === true) {
            await api.setLibraryMovieWatched(movie.id, true)
          }
          movieCount++
        }

        await refresh()
        const sync = await handleSync(true)
        if (!sync) throw new Error('Metadata sync did not complete.')
        setImportResult(`Imported ${tvCount} TV show${tvCount !== 1 ? 's' : ''} and ${movieCount} movie${movieCount !== 1 ? 's' : ''}; metadata synced for ${sync.succeeded} of ${sync.total} shows.`)
      } catch(e) {
        setImportResult(`Import failed: ${e instanceof Error ? e.message : 'Invalid file'}`)
      } finally {
        setImportLoading(false)
      }
    }
    input.click()
  }

  return (
    <main className={appStyles.settingsPanel}>
      <div className={styles.settingsHeader}>
        <button className={appStyles.secondaryButton} onClick={() => navigate('/unwatched')} type="button">
          Back to tracker
        </button>
        <h2>App settings</h2>
      </div>

      <div className={styles.settingsGrid}>
        <section className={`${styles.settingsCard} ${appStyles.wideCard}`}>
          <div>
            <strong>Library Statistics</strong>
            {stats ? (
              <div style={{ display: 'flex', gap: '30px', marginTop: '10px', flexWrap: 'wrap' }}>
                <div>Total Movies: <strong style={{ color: 'var(--accent)' }}>{stats.totalMovies}</strong></div>
                <div>Total TV Shows: <strong style={{ color: 'var(--accent)' }}>{stats.totalTvShows}</strong></div>
                <div>Unfollowed Shows with Progress: <strong style={{ color: 'var(--accent)' }}>{stats.showsWithEpisodesButNotFollowed}</strong></div>
              </div>
            ) : (
              <p>Loading statistics...</p>
            )}
          </div>
        </section>

        <label className={styles.settingsCard}>
          <div>
            <strong>Notifications</strong>
            <p>Receive alerts when new episodes are coming soon.</p>
          </div>
          <button className={appStyles.primaryButton} onClick={() => void toggleSetting('notificationsEnabled')} type="button">
            {settings?.notificationsEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </label>

        <label className={styles.settingsCard}>
          <div>
            <strong>Dark mode</strong>
            <p>Use a darker theme when available.</p>
          </div>
          <button className={appStyles.primaryButton} onClick={() => void toggleSetting('darkMode')} type="button">
            {settings?.darkMode ? 'On' : 'Off'}
          </button>
        </label>

        <label className={styles.settingsCard}>
          <div>
            <strong>NSFW Content</strong>
            <p>Include adult / 18+ items in TMDb search results.</p>
          </div>
          <button className={appStyles.primaryButton} onClick={() => void toggleSetting('nsfwEnabled')} type="button">
            {settings?.nsfwEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </label>

        <section className={styles.settingsCard}>
          <div>
            <strong>Upcoming view</strong>
            <p>Default layout mode when viewing upcoming releases.</p>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className={settings?.defaultUpcomingView === 'calendar' ? appStyles.secondaryButton : appStyles.primaryButton}
              onClick={() => void updateSetting('defaultUpcomingView', 'list')}
              type="button"
              style={{ minHeight: '38px', padding: '8px 14px' }}
            >
              List
            </button>
            <button
              className={settings?.defaultUpcomingView === 'calendar' ? appStyles.primaryButton : appStyles.secondaryButton}
              onClick={() => void updateSetting('defaultUpcomingView', 'calendar')}
              type="button"
              style={{ minHeight: '38px', padding: '8px 14px' }}
            >
              📅 Calendar
            </button>
          </div>
        </section>

        <section className={`${styles.settingsCard} ${appStyles.wideCard}`}>
          <div>
            <strong>Preferred genres</strong>
            <p>{settings?.preferredGenres.join(', ') || 'No genres selected'}</p>
          </div>
        </section>

        <section className={`${styles.settingsCard} ${appStyles.wideCard}`}>
          <div>
            <strong>Export library & recommendations</strong>
            <p>Export your watch history and library formatted for recommendations (Couchmoney, Simkl, Trakt) or Letterboxd.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className={appStyles.secondaryButton} onClick={() => void handleExport('json')} type="button" disabled={exportLoading}>
              {exportLoading ? 'Exporting…' : 'Export JSON'}
            </button>
            <button className={appStyles.secondaryButton} onClick={() => void handleExport('couchmoney-csv')} type="button" disabled={exportLoading} title="Optimized for Couchmoney, Trakt, and Simkl recommendation feeds">
              📊 Couchmoney / Trakt CSV
            </button>
            <button className={appStyles.secondaryButton} onClick={() => void handleExport('letterboxd-csv')} type="button" disabled={exportLoading} title="Letterboxd compatible diary/watchlist CSV">
              🎬 Letterboxd CSV
            </button>
          </div>
        </section>

        <section className={`${styles.settingsCard} ${appStyles.wideCard}`}>
          <div>
            <strong>Server SQLite Backups</strong>
            <p>Automated rolling backups run weekly (keeping the latest 2 snapshots in <code>/backups</code>). You can also trigger an immediate server backup snapshot.</p>
          </div>
          <button
            className={appStyles.secondaryButton}
            onClick={async () => {
              try {
                const res = await api.triggerBackup()
                alert(`Backup created successfully: ${res.backupFile}`)
              } catch(e) {
                alert(`Backup failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
              }
            }}
            type="button"
          >
            💾 Create Server Snapshot Now
          </button>
        </section>

        <section className={`${styles.settingsCard} ${appStyles.wideCard}`}>
          <div>
            <strong>Import library</strong>
            <p>Restore from a previously exported JSON file. Existing entries will not be duplicated.</p>
          </div>
          <button className={appStyles.secondaryButton} onClick={handleImport} type="button" disabled={importLoading}>
            {importLoading ? 'Importing…' : 'Import JSON'}
          </button>
          {importResult && <p>{importResult}</p>}
        </section>

        <section className={`${styles.settingsCard} ${appStyles.wideCard}`}>
          <div>
            <strong>Library sync</strong>
            <p>Force a manual TMDb refresh for tracked shows and inspect the result log.</p>
            {stats && (
              <div style={{ marginTop: '10px', fontSize: '0.9rem', borderLeft: '3px solid ' + (stats.lastSyncSucceeded ? '#22c55e' : stats.lastSyncSucceeded === false ? '#ef4444' : 'var(--border)'), paddingLeft: '10px' }}>
                <strong>Last sync status:</strong>{' '}
                {stats.lastSyncSucceeded === true ? (
                  <span style={{ color: '#22c55e' }}>🟢 Success</span>
                ) : stats.lastSyncSucceeded === false ? (
                  <span style={{ color: '#ef4444' }}>🔴 Error</span>
                ) : (
                  <span>Never run</span>
                )}
                {stats.lastSyncAt && (
                  <span style={{ marginLeft: '10px', color: 'var(--text)' }}>
                    ({new Date(stats.lastSyncAt).toLocaleString()})
                  </span>
                )}
                {stats.lastSyncMessage && (
                  <p style={{ margin: '4px 0 0', fontStyle: 'italic', color: 'var(--text)' }}>
                    {stats.lastSyncMessage}
                  </p>
                )}
              </div>
            )}
          </div>
          <button className={appStyles.primaryButton} onClick={() => void handleSync()} type="button" disabled={syncLoading}>
            {syncLoading ? 'Syncing...' : 'Sync now'}
          </button>
          {syncError && <p>{syncError}</p>}
          {syncResult && (
            <div>
              <p>{`Total: ${syncResult.total}, Succeeded: ${syncResult.succeeded}, Failed: ${syncResult.failed}`}</p>
              <ul>
                {syncResult.items.map((item: LibrarySyncItem) => (
                  <li key={`${item.showId}-${item.syncedAt}`}>
                    <strong>{item.title}</strong> {item.success ? 'synced' : 'failed'}: {item.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
