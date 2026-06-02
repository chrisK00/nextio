import { useNavigate } from 'react-router'
import styles from '../../App.module.css'

export default function HeaderBar() {
	const navigate = useNavigate()

	return (
		<header className={styles.appBar}>
			<div className={styles.headerTitle}>
				<p className={styles.eyebrow}>TV Show Tracker</p>
			</div>

			<div className={styles.headerActions}>
				<button className={styles.secondaryButton} onClick={() => navigate('/search')} type="button">
					Search
				</button>
				<button className={styles.primaryButton} onClick={() => navigate('/settings')} type="button">
					Settings
				</button>
			</div>
		</header>
	)
}
