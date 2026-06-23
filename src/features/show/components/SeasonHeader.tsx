import { useState } from 'react'
import * as api from '../../../services/api'
import type { Season, TvShow, Episode } from '../../../services/apiTypes'
import { useAppContext } from '../../../state/AppContext'

export default function SeasonHeader({ season, showId, onRefetch, onOptimisticUpdate, isTracked = true }: {
  season: Season
  showId: string
  onRefetch?: () => Promise<TvShow | null>
  onOptimisticUpdate?: (seasonNum: number, episodeNums: number[], watched: boolean) => void
  /** If false the checkbox is hidden – episodes can't be marked on an unfollowed show. */
  isTracked?: boolean
}) {
  const { refresh } = useAppContext()
  const [loading, setLoading] = useState(false)
  const isUpcomingSeason = season.episodes.length === 0
  const allWatched = season.episodes.every((ep: Episode) => ep.watched)

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <h3>Season {season.season}</h3>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {!isUpcomingSeason && isTracked && (
          <input
            type="checkbox"
            checked={allWatched}
            disabled={loading}
            onChange={async (e) => {
              setLoading(true)
              try {
                const shouldCheck = e.target.checked
                const toToggle = shouldCheck
                  ? season.episodes.filter((ep: Episode) => !ep.watched)
                  : season.episodes.filter((ep: Episode) => ep.watched)

                onOptimisticUpdate?.(season.season, toToggle.map((ep: Episode) => ep.episode), shouldCheck)

                // Single bulk request instead of Promise.all of N individual calls
                await api.setLibraryEpisodesWatchedBulk(
                  showId,
                  toToggle.map((ep: Episode) => ({ season: season.season, episode: ep.episode, watched: shouldCheck })),
                )

                await refresh()
                await onRefetch?.()
              } finally {
                setLoading(false)
              }
            }}
          />
        )}
        <span>
          {isUpcomingSeason
            ? 'Upcoming season'
            : loading
              ? 'Updating…'
              : allWatched
                ? 'All watched'
                : 'Mark all watched'}
        </span>
      </label>
    </div>
  )
}
