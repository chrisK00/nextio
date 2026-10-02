import { useAppContext } from '../../state/AppContext'
import { FiClock } from 'react-icons/fi'
import styles from './LibraryStatusBanner.module.css'

export default function LibraryStatusBanner() {
    const { isAuthenticated, isLibraryLoaded, libraryIsStale, libraryIsRefreshing, libraryLastUpdatedAt, isOnline } = useAppContext()

    const isRefreshingCachedLibrary = isOnline && libraryIsStale && libraryIsRefreshing

    if(!isAuthenticated || !isLibraryLoaded || isRefreshingCachedLibrary || (isOnline && !libraryIsStale && !libraryIsRefreshing)) {
        return null
    }

    const message = !isOnline || (libraryIsStale && !libraryIsRefreshing) ? 'Offline' : 'Syncing…'

    return (
        <div className={styles.libraryStatus} role="status" aria-live="polite">
            <span>{message}</span>
            {libraryLastUpdatedAt && (
                <time dateTime={libraryLastUpdatedAt} title={`Last updated ${new Date(libraryLastUpdatedAt).toLocaleString()}`}>
                    <FiClock aria-hidden="true" size={13} />
                    {new Date(libraryLastUpdatedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </time>
            )}
        </div>
    )
}