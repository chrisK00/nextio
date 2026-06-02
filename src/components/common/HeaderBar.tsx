import styles from '../../App.module.css'

type HeaderBarProps = {
	onOpenSearch: () => void
	onOpenSettings: () => void
}

export default function HeaderBar({ onOpenSearch, onOpenSettings }: HeaderBarProps) {
	return (
		<header className={styles.appBar}>
			<div className={styles.headerTitle}>
				<p className={styles.eyebrow}>TV Show Tracker</p>
			</div>

			<div className={styles.headerActions}>
				<button className={styles.secondaryButton} onClick={onOpenSearch} type="button">
					Search
				</button>
				<button className={styles.primaryButton} onClick={onOpenSettings} type="button">
					Settings
				</button>
			</div>
		</header>
	)
}
