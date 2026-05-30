import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { AppProvider } from './state/AppContext'
import HeaderBar from './components/HeaderBar'
import HomePage from './pages/HomePage'
import SearchPage from './pages/SearchPage'
import ShowPage from './pages/ShowPage'
import SettingsPage from './pages/SettingsPage'
import styles from './App.module.css'

function AppRouter() {
	const navigate = useNavigate()
	return (
		<div className={styles.appShell}>
			<HeaderBar onOpenSearch={() => navigate('/search')} onOpenSettings={() => navigate('/settings')} />
			<Routes>
				<Route path="/" element={<HomePage />} />
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
