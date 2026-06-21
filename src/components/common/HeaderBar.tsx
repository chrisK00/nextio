import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../../state/AppContext'
import appStyles from '../../App.module.css'
import styles from './HeaderBar.module.css'
import { CiSearch, CiSettings } from "react-icons/ci";


export default function HeaderBar() {
	const navigate = useNavigate()
	const { isAuthenticated, username, logout } = useAppContext()

	return (
		<header className={styles.appBar}>
			<div className={styles.headerTitle}>
				{isAuthenticated ? (
					<>
						<div className={styles.flexCenter}>
							<p className={styles.eyebrow}>nextio</p>
							<div className={styles.signedInUserContainer}>
								<span className={styles.username}>{username}</span>
								<button className={appStyles.ghostButton} onClick={() => { logout(); navigate('/') }} type="button">Logout</button>
							</div>
						</div>
					</>
				) : (
					<>
						<p className={styles.eyebrow}>nextio</p>
						<button className={appStyles.ghostButton} onClick={() => navigate('/login')} type="button">Login</button>
						<button className={appStyles.ghostButton} onClick={() => navigate('/register')} type="button">Sign up</button>
					</>
				)}
			</div>

			<div className={styles.headerActions}>
				<button className={appStyles.secondaryButton} onClick={() => navigate('/search')} type="button">
					<CiSearch style={{ marginRight: '0.2rem' }} />
					Search
				</button>
				<button className={appStyles.secondaryButton} onClick={() => navigate('/movies')} type="button">
					Movies
				</button>
				<button className={appStyles.primaryButton} onClick={() => navigate('/settings')} type="button">
					<CiSettings style={{ marginRight: '0.2rem' }} />
					Settings
				</button>

			</div>
		</header>
	)
}
