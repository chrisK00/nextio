import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../../state/AppContext'
import appStyles from '../../App.module.css'
import styles from './HeaderBar.module.css'
import { CiSearch, CiSettings, CiVideoOn  } from "react-icons/ci";


export default function HeaderBar() {
	const navigate = useNavigate()
	const { isAuthenticated, username, logout } = useAppContext()
	const navigateTo = (path: string) => {
		window.scrollTo(0, 0)
		navigate(path)
	}

	return (
		<header className={styles.appBar}>
			<div className={styles.headerTitle}>
				{isAuthenticated ? (
					<>
								<div className={styles.flexCenter}>
									<p className={styles.eyebrow}>nextio</p>
									<div className={styles.signedInUserContainer}>
										<span className={styles.username}>{username}</span>
										<button className={appStyles.ghostButton} onClick={() => { logout(); navigateTo('/') }} type="button">Logout</button>
									</div>
								</div>
					</>
				) : (
					<>
						<p className={styles.eyebrow}>nextio</p>
						<button className={appStyles.ghostButton} onClick={() => navigateTo('/login')} type="button">Login</button>
						<button className={appStyles.ghostButton} onClick={() => navigateTo('/register')} type="button">Sign up</button>
					</>
				)}
			</div>

			<div className={styles.headerActions}>
				<button className={appStyles.secondaryButton} onClick={() => navigateTo('/search')} type="button">
					<CiSearch style={{ marginRight: '0.2rem' }} />
					Search
				</button>
				<button className={appStyles.secondaryButton} onClick={() => navigateTo('/movies')} type="button">
					<CiVideoOn style={{ marginRight: '0.2rem' }} />
					Movies
				</button>
				<button className={appStyles.secondaryButton} onClick={() => navigateTo('/settings')} type="button">
					<CiSettings style={{ marginRight: '0.2rem' }} />
					Settings
				</button>

			</div>
		</header>
	)
}
