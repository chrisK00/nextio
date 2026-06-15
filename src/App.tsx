import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './state/AppContext'
import HeaderBar from './components/common/HeaderBar'
import BottomNav from './components/common/BottomNav'
import UnwatchedPage from './features/home/pages/UnwatchedPage'
import UpcomingPage from './features/home/pages/UpcomingPage'
import WatchingPage from './features/home/pages/WatchingPage'
import MoviesPage from './features/home/pages/MoviesPage'
import SearchPage from './features/search/SearchPage'
import ShowPage from './features/show/ShowPage'
import SettingsPage from './features/settings/SettingsPage'
import RequireAuth from './features/auth/RequireAuth'
import LoginPage from './features/auth/LoginPage'
import RegisterPage from './features/auth/RegisterPage'
import styles from './App.module.css'

function AppRouter() {
	return (
		<div className={styles.appShell}>
			<HeaderBar />
			<Routes>
				<Route path="/" element={<RequireAuth><UnwatchedPage /></RequireAuth>} />
				<Route path="/unwatched" element={<RequireAuth><UnwatchedPage /></RequireAuth>} />
				<Route path="/upcoming" element={<RequireAuth><UpcomingPage /></RequireAuth>} />
				<Route path="/watching" element={<RequireAuth><WatchingPage /></RequireAuth>} />
				<Route path="/movies" element={<RequireAuth><MoviesPage /></RequireAuth>} />
				<Route path="/library" element={<RequireAuth><WatchingPage /></RequireAuth>} />
				<Route path="/library/tv" element={<RequireAuth><WatchingPage /></RequireAuth>} />
				<Route path="/library/movies" element={<RequireAuth><MoviesPage /></RequireAuth>} />
				<Route path="/search" element={<RequireAuth><SearchPage /></RequireAuth>} />
				<Route path="/show/:id" element={<RequireAuth><ShowPage /></RequireAuth>} />
				<Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
				<Route path="/login" element={<LoginPage />} />
				<Route path="/register" element={<RegisterPage />} />
			</Routes>
			<BottomNav />
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
