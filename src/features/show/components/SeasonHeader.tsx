import { useState } from 'react'
import * as api from '../../../services/api'

export default function SeasonHeader({ season, showId, onRefetch, onOptimisticUpdate }: {
  season: import('../../../services/api').Season
  showId: string
  onRefetch?: () => Promise<import('../../../services/api').TvShow | null>
  onOptimisticUpdate?: (seasonNum: number, episodeNums: number[], watched: boolean) => void
}) {
  const [loading, setLoading] = useState(false)

  const allWatched = season.episodes.every((ep) => ep.watched)

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <h3>Season {season.season}</h3>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                const toToggle = season.episodes.filter((ep) => !ep.watched)
                // optimistic update
                onOptimisticUpdate?.(season.season, toToggle.map((ep) => ep.episode), true)
                await Promise.all(toToggle.map((ep) => api.toggleEpisodeWatched(showId, season.season, ep.episode)))
              } else {
                // mark only watched episodes unwatched
                const toToggle = season.episodes.filter((ep) => ep.watched)
                onOptimisticUpdate?.(season.season, toToggle.map((ep) => ep.episode), false)
                await Promise.all(toToggle.map((ep) => api.toggleEpisodeWatched(showId, season.season, ep.episode)))
              }
              await onRefetch?.()
            } finally {
              setLoading(false)
            }
          }}
        />
        <span>{loading ? 'Updating…' : allWatched ? 'All watched' : 'Mark all watched'}</span>
      </label>
    </div>
  )
}
