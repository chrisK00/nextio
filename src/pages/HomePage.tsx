import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TabBar from '../components/TabBar'
import TabContent from '../components/TabContent'
import styles from '../App.module.css'
import type { TabKey } from '../types'
import BottomNav from '../components/BottomNav'
import useWatching from '../hooks/useWatching'

export default function HomePage() {
  const { watching: watchingNow, unwatched: unwatchedShows, upcoming: upcomingShows } = useWatching()
  const [activeTab, setActiveTab] = useState<TabKey>('watching')
  const navigate = useNavigate()

  const counts = useMemo(
    () => ({ watching: watchingNow.length, unwatched: unwatchedShows.length, upcoming: upcomingShows.length }),
    [watchingNow.length, unwatchedShows.length, upcomingShows.length],
  )

  function handleShowClick(id: string) {
    navigate(`/show/${encodeURIComponent(id)}`)
  }

  return (
    <main className={styles.mainPanel}>
      <TabBar activeTab={activeTab} counts={counts} onChangeTab={(t) => setActiveTab(t)} />
      <section className={styles.tabContent}>
        <TabContent activeTab={activeTab} onShowClick={(s) => handleShowClick(s.id)} />
      </section>

      <BottomNav activeTab={activeTab} onChangeTab={(t) => setActiveTab(t)} />
    </main>
  )
}
