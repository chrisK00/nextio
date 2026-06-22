import { useParams, useNavigate } from 'react-router-dom'
import type { TvShow } from "../../services/apiTypes"
import ShowDetailPanel from './components/ShowDetailPanel'
import useShow from './hooks/useShow'
import { useAppContext } from '../../state/AppContext'

export default function ShowPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const decoded = id ? decodeURIComponent(id) : undefined
  const { show, loading, isTracked, setIsTracked, refetch } = useShow(decoded)
  const { toggleEpisode, followShow, unfollowShow } = useAppContext()
  const handleFollowToggle = async (target: TvShow, tracked: boolean) => {
    if(tracked) {
      await unfollowShow(target.id, target.mediaType)
      setIsTracked(false)
    } else {
      await followShow(target)
      setIsTracked(true)
    }
    await refetch()
  }

  return (
    <ShowDetailPanel
      key={show?.id}
      show={show}
      isLoading={loading}
      onBack={() => navigate(-1)}
      onToggleEpisode={toggleEpisode}
      onFollowToggle={handleFollowToggle}
      isTracked={isTracked}
      onRefetch={refetch}
    />
  )
}
