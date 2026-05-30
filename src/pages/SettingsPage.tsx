import SettingsPanel from '../components/SettingsPanel'
import { useAppContext } from '../state/AppContext'
import { useNavigate } from 'react-router-dom'

export default function SettingsPage() {
  const { settings, toggleSetting } = useAppContext()
  const navigate = useNavigate()

  return (
    <SettingsPanel settings={settings} onBack={() => navigate('/')} onToggleSetting={(k) => void toggleSetting(k)} />
  )
}
