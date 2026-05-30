import styles from '../App.module.css'

type HeaderBarProps = {
	onOpenSearch: () => void
	onOpenSettings: () => void
}

export default function HeaderBar({ onOpenSearch, onOpenSettings }: HeaderBarProps) {
	return (
		<header className={styles.appBar}>
			<div className={styles.headerTitle}>
				<div>
					<p className={styles.eyebrow}>TV Show Tracker</p>
					<h1 className={styles.title}>Follow current shows & premieres</h1>
				</div>
				<p className={styles.subtitle}>Manage what you're watching and what drops next.</p>
			</div>

			<div className={styles.headerActions}>
				<button className={styles.secondaryButton} onClick={onOpenSearch} type="button">
					Search Shows
				</button>
				<button className={styles.primaryButton} onClick={onOpenSettings} type="button">
					Settings
				</button>
			</div>
		</header>
	)
}
