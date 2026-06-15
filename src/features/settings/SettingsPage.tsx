import { useState } from 'react'
import { useAppContext } from '../../state/AppContext'
import { useNavigate } from 'react-router-dom'
import styles from './SettingsPage.module.css'
import appStyles from '../../App.module.css'
import * as api from '../../services/api'

export default function SettingsPage() {
  const { settings, toggleSetting, watchlist, movies, refresh } = useAppContext()
  const navigate = useNavigate()
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncResult, setSyncResult] = useState<api.LibrarySyncResponse | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  const handleSync = async () => {
    setSyncLoading(true)
    setSyncError(null)
    try {
      const result = await api.syncLibrary()
      setSyncResult(result)
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Sync failed')
    } finally {
      setSyncLoading(false)
    }
  }

  const [exportLoading, setExportLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)

  type ExportEpisode = { season: number; episode: number; watched: boolean }
  type ExportShow = { id: string; title: string; status?: string; episodes: ExportEpisode[] }
  type ExportMovie = { id: string; title: string }
  type ExportFile = { tvShows: ExportShow[]; movies: ExportMovie[] }

  const handleExport = async () => {
    setExportLoading(true)
    try {
      const tvDetails = await Promise.all(watchlist.map((s) => api.getLibraryTvShow(s.id)))
      const data = {
        exportedAt: new Date().toISOString(),
        tvShows: tvDetails.filter(Boolean).map((d) => ({
          id: d!.show.id,
          title: d!.show.title,
          status: d!.show.status,
          episodes: d!.episodes.map((e) => ({ season: e.season, episode: e.episode, watched: e.watched })),
        })),
        movies: movies.map((m) => ({ id: m.id, title: m.title })),
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nextio-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
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

        for(const show of data.tvShows ?? []) {
          await api.addLibraryTvShow({ id: show.id, title: show.title, mediaType: 'tv', network: '', status: show.status ?? '', episodesWatched: 0, episodesTotal: 0, nextEpisodeTitle: '', description: '' })
          for(const ep of show.episodes?.filter((e) => e.watched) ?? []) {
            await api.setLibraryEpisodeWatched(show.id, ep.season, ep.episode, true)
          }
          tvCount++
        }

        for(const movie of data.movies ?? []) {
          await api.addLibraryMovie({ id: movie.id, title: movie.title, mediaType: 'movie', network: '', status: '', episodesWatched: 0, episodesTotal: 0, nextEpisodeTitle: '', description: '' })
          movieCount++
        }

        await refresh()
        setImportResult(`Imported ${tvCount} TV show${tvCount !== 1 ? 's' : ''} and ${movieCount} movie${movieCount !== 1 ? 's' : ''}.`)
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

        <section className={`${styles.settingsCard} ${appStyles.wideCard}`}>
          <div>
            <strong>Preferred genres</strong>
            <p>{settings?.preferredGenres.join(', ') || 'No genres selected'}</p>
          </div>
        </section>

        <section className={`${styles.settingsCard} ${appStyles.wideCard}`}>
          <div>
            <strong>Export library</strong>
            <p>Download your TV shows and movies as a JSON file.</p>
          </div>
          <button className={appStyles.secondaryButton} onClick={() => void handleExport()} type="button" disabled={exportLoading}>
            {exportLoading ? 'Exporting…' : 'Export JSON'}
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
          </div>
          <button className={appStyles.primaryButton} onClick={() => void handleSync()} type="button" disabled={syncLoading}>
            {syncLoading ? 'Syncing...' : 'Sync now'}
          </button>
          {syncError && <p>{syncError}</p>}
          {syncResult && (
            <div>
              <p>{`Total: ${syncResult.total}, Succeeded: ${syncResult.succeeded}, Failed: ${syncResult.failed}`}</p>
              <ul>
                {syncResult.items.map((item) => (
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
