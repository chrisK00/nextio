import { useState } from 'react'
import { useAppContext } from '../../state/AppContext'
import { useNavigate } from 'react-router-dom'
import styles from './SettingsPage.module.css'
import appStyles from '../../App.module.css'
import * as api from '../../services/api'

export default function SettingsPage() {
  const { settings, toggleSetting } = useAppContext()
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
