import { useState } from 'react'
import * as api from '../../../services/api'
import type { Season, TvShow, Episode } from '../../../services/apiTypes'
import { useAppContext } from '../../../state/AppContext'

export default function SeasonHeader({ season, showId, onRefetch, onOptimisticUpdate }: {
  season: Season
  showId: string
  onRefetch?: () => Promise<TvShow | null>
  onOptimisticUpdate?: (seasonNum: number, episodeNums: number[], watched: boolean) => void
}) {
  const { refresh } = useAppContext()
  const [loading, setLoading] = useState(false)
  const isUpcomingSeason = season.episodes.length == 0;

  const allWatched = season.episodes.every((ep: Episode) => ep.watched)

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <h3>Season {season.season}</h3>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {!isUpcomingSeason &&
          <input
            type="checkbox"
            checked={allWatched}
            disabled={loading}
            onChange={async (e) => {
              setLoading(true)
              try {
                const shouldCheck = e.target.checked
                if(shouldCheck) {
                  // mark only unwatched episodes watched
                  const toToggle = season.episodes.filter((ep: Episode) => !ep.watched)
                  // optimistic update
                  onOptimisticUpdate?.(season.season, toToggle.map((ep: Episode) => ep.episode), true)
                  await Promise.all(toToggle.map((ep: Episode) => api.setLibraryEpisodeWatched(showId, season.season, ep.episode, true)))
                } else {
                  // mark only watched episodes unwatched
                  const toToggle = season.episodes.filter((ep: Episode) => ep.watched)
                  onOptimisticUpdate?.(season.season, toToggle.map((ep: Episode) => ep.episode), false)
                  await Promise.all(toToggle.map((ep: Episode) => api.setLibraryEpisodeWatched(showId, season.season, ep.episode, false)))
                }
                await refresh()
                await onRefetch?.()
              } finally {
                setLoading(false)
              }
            }}
          />
        }
        <span>{loading ? 'Updating…' : isUpcomingSeason ? "Upcoming season" : allWatched ? 'All watched' : 'Mark all watched'}</span>
      </label>
    </div>
  )
}
