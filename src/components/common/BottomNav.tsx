import { useNavigate, useLocation } from 'react-router-dom'
import styles from './BottomNav.module.css'

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const currentPath = location.pathname

  return (
    <nav className={styles.bottomNav} aria-label="Primary navigation">
      <button
        type="button"
        className={`${styles.bottomNavButton} ${currentPath === '/unwatched' ? styles.bottomNavActive : ''}`}
        onClick={() => navigate('/unwatched')}
        aria-label="Unwatched"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path d="M3 7h18v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 3v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Unwatched</span>
      </button>

      <button
        type="button"
        className={`${styles.bottomNavButton} ${currentPath === '/upcoming' ? styles.bottomNavActive : ''}`}
        onClick={() => navigate('/upcoming')}
        aria-label="Upcoming"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Upcoming</span>
      </button>

      <button
        type="button"
        className={`${styles.bottomNavButton} ${currentPath === '/watching' ? styles.bottomNavActive : ''}`}
        onClick={() => navigate('/watching')}
        aria-label="My Shows"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path d="M3 12s4-8 9-8 9 8 9 8-4 8-9 8-9-8-9-8z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
        <span>My Shows</span>
      </button>
    </nav>
  )
}
