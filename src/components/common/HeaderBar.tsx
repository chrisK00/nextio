import { useNavigate } from 'react-router'
import appStyles from '../../App.module.css'
import styles from './HeaderBar.module.css'
import { CiSearch, CiSettings } from "react-icons/ci";


export default function HeaderBar() {
	const navigate = useNavigate()

	return (
		<header className={styles.appBar}>
			<div className={styles.headerTitle}>
				<p className={styles.eyebrow}>TV Show Tracker</p>
			</div>

			<div className={styles.headerActions}>
				<button className={appStyles.secondaryButton} onClick={() => navigate('/search')} type="button">
					<CiSearch style={{ marginRight: '0.2rem' }} />
					Search
				</button>
				<button className={appStyles.primaryButton} onClick={() => navigate('/settings')} type="button">
					<CiSettings style={{ marginRight: '0.2rem' }} />
					Settings
				</button>
			</div>
		</header>
	)
}
