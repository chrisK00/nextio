import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getShowDetails, getUserList, removeListItem } from '../../services/api'
import type { UserList } from '../../services/apiTypes'
import appStyles from '../../App.module.css'
import styles from './ListsPage.module.css'

type DisplayItem = UserList['items'][number] & { genres: string[] }
const emptyDisplayItems: DisplayItem[] = []

export default function ListDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [list, setList] = useState<UserList | null>(null)
  const [displayItems, setDisplayItems] = useState<DisplayItem[]>([])
  const [loadedListId, setLoadedListId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState('')
  const [error, setError] = useState('')
  const [errorListId, setErrorListId] = useState<string | null>(null)

  useEffect(() => {
    if(!id) return
    let active = true

    getUserList(id).then((loaded) => {
      if(!active) return
      setList(loaded)
      setDisplayItems(loaded.items.map((item) => ({ ...item, genres: [] })))
      setLoadedListId(id)
      setError('')
      setErrorListId(null)
      void Promise.all(loaded.items.map(async (item) => [item.id, (await getShowDetails(item.itemId))?.genres ?? []] as const))
        .then((enriched) => {
          if(active) {
            const genresByItemId = new Map(enriched)
            setDisplayItems((current) => current.map((item) => ({ ...item, genres: genresByItemId.get(item.id) ?? item.genres })))
          }
        })
        .catch((error: unknown) => {
          console.warn('Could not load genres for list items:', error)
        })
    }).catch((e: unknown) => {
      if(active) {
        setError(e instanceof Error ? e.message : 'Could not load list')
        setErrorListId(id)
      }
    })

    return () => { active = false }
  }, [id])

  const currentList = loadedListId === id ? list : null
  const currentDisplayItems = loadedListId === id ? displayItems : emptyDisplayItems
  const currentError = errorListId === id ? error : ''
  const genres = useMemo(() => [...new Set(currentDisplayItems.flatMap((item) => item.genres))].sort(), [currentDisplayItems])
  const genreCounts = useMemo(() => Object.fromEntries(genres.map((itemGenre) => [itemGenre, currentDisplayItems.filter((item) => item.genres.includes(itemGenre)).length])), [genres, currentDisplayItems])
  const items = useMemo(() => currentDisplayItems.filter((item) => item.title.toLowerCase().includes(query.toLowerCase().trim()) && (!genre || item.genres.includes(genre))), [currentDisplayItems, query, genre])

  if(currentError) return <main className={appStyles.mainPanel}><div className={styles.emptyState}>{currentError}</div></main>
  if(!currentList) return <main className={appStyles.mainPanel}><div className={styles.emptyState}>Loading list...</div></main>

  return <main className={appStyles.mainPanel}><section className={styles.page}>
    <button className={styles.backButton} type="button" onClick={() => navigate('/lists')}>← Back to lists</button>
    <h1 className={styles.detailTitle}>{currentList.name}</h1>
    <p className={styles.detailDescription}>{currentList.description || '\u00a0'}</p>
    <div className={styles.listFilters}><input className={styles.input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search this list..." /><select className={styles.input} value={genre} onChange={(e) => setGenre(e.target.value)}><option value="">All genres</option>{genres.map((itemGenre) => <option key={itemGenre} value={itemGenre}>{itemGenre} ({genreCounts[itemGenre]})</option>)}</select></div>
    {items.length === 0 ? <div className={styles.emptyState}>{query ? 'No matching items.' : 'This list is empty.'}</div> : <div className={styles.itemGrid}>
      {items.map((item) => <div className={styles.itemCard} key={item.id} onClick={() => navigate(`/show/${encodeURIComponent(item.itemId)}`)}>
        {item.posterUrl && <img src={item.posterUrl} alt="" className={styles.itemPoster} />}
        <strong>{item.title}</strong>
        {item.genres.length > 0 && <span className={styles.itemGenres}>{item.genres.join(' · ')}</span>}
        <button className={styles.deleteButton} type="button" onClick={async (event) => { event.stopPropagation(); const updated = await removeListItem(currentList.id, item.itemId); setList(updated); setDisplayItems((current) => current.filter((displayItem) => displayItem.id !== item.id)) }}>Remove</button>
      </div>)}
    </div>}
  </section></main>
}
