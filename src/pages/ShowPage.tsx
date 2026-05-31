import { useParams, useNavigate } from 'react-router-dom'
import ShowDetailPanel from '../components/ShowDetailPanel'
import useShow from '../hooks/useShow'
import { useAppContext } from '../state/AppContext'

export default function ShowPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const decoded = id ? decodeURIComponent(id) : undefined
  const { show, loading, refetch } = useShow(decoded)
  const { toggleEpisode, addShow } = useAppContext()

  return (
    <ShowDetailPanel
      show={show}
      isLoading={loading}
      onBack={() => navigate('/')}
      onToggleEpisode={toggleEpisode}
      onAdd={(s) => addShow(s)}
      onRefetch={refetch}
    />
  )
}
