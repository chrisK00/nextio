import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './state/AppContext'
import HeaderBar from './components/common/HeaderBar'
import UnwatchedPage from './features/home/pages/UnwatchedPage'
import UpcomingPage from './features/home/pages/UpcomingPage'
import WatchingPage from './features/home/pages/WatchingPage'
import SearchPage from './features/search/SearchPage'
import ShowPage from './features/show/ShowPage'
import SettingsPage from './features/settings/SettingsPage'
import styles from './App.module.css'

function AppRouter() {
	return (
		<div className={styles.appShell}>
			<HeaderBar />
			<Routes>
				<Route path="/unwatched" element={<UnwatchedPage />} />
				<Route path="/upcoming" element={<UpcomingPage />} />
				<Route path="/watching" element={<WatchingPage />} />
				<Route path="/search" element={<SearchPage />} />
				<Route path="/show/:id" element={<ShowPage />} />
				<Route path="/settings" element={<SettingsPage />} />
			</Routes>
		</div>
	)
}

export default function App() {
	return (
		<AppProvider>
			<BrowserRouter>
				<AppRouter />
			</BrowserRouter>
		</AppProvider>
	)
}
