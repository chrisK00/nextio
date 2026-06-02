import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TabContent from './components/TabContent'
import styles from '../../App.module.css'
import type { TabKey } from '../../types'
import BottomNav from './components/BottomNav'

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('unwatched')
  const navigate = useNavigate()

  function handleShowClick(id: string) {
    navigate(`/show/${encodeURIComponent(id)}`)
  }

  return (
    <main className={styles.mainPanel}>
      <section className={styles.tabContent}>
        <TabContent activeTab={activeTab} onShowClick={(s) => handleShowClick(s.id)} />
      </section>

      <BottomNav activeTab={activeTab} onChangeTab={(t) => setActiveTab(t)} />
    </main>
  )
}
