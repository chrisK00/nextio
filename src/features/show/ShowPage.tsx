import { useParams, useNavigate } from 'react-router-dom'
import type { TvShow } from "../../services/apiTypes"
import ShowDetailPanel from './components/ShowDetailPanel'
import useShow from './hooks/useShow'
import { useAppContext } from '../../state/AppContext'

export default function ShowPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const decoded = id ? decodeURIComponent(id) : undefined
  const { show, loading, refetch } = useShow(decoded)
  const { watchlist, movies, toggleEpisode, followShow, unfollowShow } = useAppContext()
  const isTracked = show ? watchlist.some((item) => item.id === show.id) || movies.some((movie) => movie.id === show.id) : false
  const handleFollowToggle = (target: TvShow, tracked: boolean) => {
    if(tracked) {
      unfollowShow(target.id, target.mediaType)
    } else {
      followShow(target)
    }
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
