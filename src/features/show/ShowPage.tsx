import { useParams, useNavigate } from 'react-router-dom'
import type { TvShow } from "../../services/apiTypes"
import ShowDetailPanel from './components/ShowDetailPanel'
import useShow from './hooks/useShow'
import { useAppContext } from '../../state/AppContext'
import * as api from '../../services/api'

export default function ShowPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const decoded = id ? decodeURIComponent(id) : undefined
  const { show, loading, isTracked, isMovieWatched, setIsTracked, setMovieWatched, refetch } = useShow(decoded)
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

  const handleMovieWatchedToggle = async (target: TvShow, watched: boolean) => {
    setMovieWatched(watched)
    await api.setLibraryMovieWatched(target.id, watched)
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
      onToggleMovieWatched={handleMovieWatchedToggle}
      isMovieWatched={isMovieWatched}
      isTracked={isTracked}
      onRefetch={refetch}
    />
  )
}
