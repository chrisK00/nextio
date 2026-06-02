import type { TabKey } from '../../../types'
import styles from '../../../App.module.css'

type BottomNavProps = {
  activeTab: TabKey
  onChangeTab: (tab: TabKey) => void
}

export default function BottomNav({ activeTab, onChangeTab }: BottomNavProps) {
  return (
    <nav className={styles.bottomNav} aria-label="Primary navigation">
      <button
        type="button"
        className={`${styles.bottomNavButton} ${activeTab === 'unwatched' ? styles.bottomNavActive : ''}`}
        onClick={() => onChangeTab('unwatched')}
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
        className={`${styles.bottomNavButton} ${activeTab === 'upcoming' ? styles.bottomNavActive : ''}`}
        onClick={() => onChangeTab('upcoming')}
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
        className={`${styles.bottomNavButton} ${activeTab === 'watching' ? styles.bottomNavActive : ''}`}
        onClick={() => onChangeTab('watching')}
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
