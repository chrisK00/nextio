import type { Settings } from '../services/api'
import styles from '../App.module.css'

type SettingsPanelProps = {
	settings: Settings | null
	onBack: () => void
	onToggleSetting: (key: keyof Pick<Settings, 'notificationsEnabled' | 'darkMode'>) => void
}

export default function SettingsPanel({ settings, onBack, onToggleSetting }: SettingsPanelProps) {
	return (
		<main className={styles.settingsPanel}>
			<div className={styles.settingsHeader}>
				<button className={styles.secondaryButton} onClick={onBack} type="button">
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
					<button className={styles.primaryButton} onClick={() => onToggleSetting('notificationsEnabled')} type="button">
						{settings?.notificationsEnabled ? 'Enabled' : 'Disabled'}
					</button>
				</label>

				<label className={styles.settingsCard}>
					<div>
						<strong>Dark mode</strong>
						<p>Use a darker theme when available.</p>
					</div>
					<button className={styles.primaryButton} onClick={() => onToggleSetting('darkMode')} type="button">
						{settings?.darkMode ? 'On' : 'Off'}
					</button>
				</label>

				<section className={`${styles.settingsCard} ${styles.wideCard}`}>
					<div>
						<strong>Preferred genres</strong>
						<p>{settings?.preferredGenres.join(', ') || 'No genres selected'}</p>
					</div>
				</section>
			</div>
		</main>
	)
}
