import styles from '../App.module.css'
import type { TabKey } from '../types'

type TabBarProps = {
	activeTab: TabKey
	counts: Record<TabKey, number>
	onChangeTab: (tab: TabKey) => void
}

const tabLabels: Record<TabKey, string> = {
	watching: 'Watching Now',
	unwatched: 'Unwatched Episodes',
	upcoming: 'Upcoming Releases',
}

export default function TabBar({ activeTab, counts, onChangeTab }: TabBarProps) {
	return (
		<div className={styles.tabBar}>
			{(Object.keys(tabLabels) as TabKey[]).map((tab) => (
				<button
					key={tab}
					type="button"
					className={`${styles.tabButton} ${tab === activeTab ? styles.tabButtonActive : ''}`}
					onClick={() => onChangeTab(tab)}
				>
					{tabLabels[tab]}
					<span>{counts[tab]}</span>
				</button>
			))}
		</div>
	)
}
