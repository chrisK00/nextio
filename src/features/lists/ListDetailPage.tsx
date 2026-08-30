import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getShowDetails, getUserList, removeListItem } from '../../services/api'
import type { UserList } from '../../services/apiTypes'
import appStyles from '../../App.module.css'
import styles from './ListsPage.module.css'

type DisplayItem = UserList['items'][number] & { genres: string[] }

export default function ListDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [list, setList] = useState<UserList | null>(null)
  const [displayItems, setDisplayItems] = useState<DisplayItem[]>([])
  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    getUserList(id).then(async (loaded) => {
      setList(loaded)
      const enriched = await Promise.all(loaded.items.map(async (item) => ({ ...item, genres: (await getShowDetails(item.itemId))?.genres ?? [] })))
      setDisplayItems(enriched)
    }).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load list'))
  }, [id])

  const genres = useMemo(() => [...new Set(displayItems.flatMap((item) => item.genres))].sort(), [displayItems])
  const items = useMemo(() => displayItems.filter((item) => item.title.toLowerCase().includes(query.toLowerCase().trim()) && (!genre || item.genres.includes(genre))), [displayItems, query, genre])

  if (error) return <main className={appStyles.mainPanel}><div className={styles.emptyState}>{error}</div></main>
  if (!list) return <main className={appStyles.mainPanel}><div className={styles.emptyState}>Loading list...</div></main>

  return <main className={appStyles.mainPanel}><section className={styles.page}>
    <button className={styles.backButton} type="button" onClick={() => navigate('/lists')}>← Back to lists</button>
    <h1 className={styles.detailTitle}>{list.name}</h1>
    <p className={styles.detailDescription}>{list.description || '\u00a0'}</p>
    <div className={styles.listFilters}><input className={styles.input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search this list..." /><select className={styles.input} value={genre} onChange={(e) => setGenre(e.target.value)}><option value="">All genres</option>{genres.map((itemGenre) => <option key={itemGenre} value={itemGenre}>{itemGenre}</option>)}</select></div>
    {items.length === 0 ? <div className={styles.emptyState}>{query ? 'No matching items.' : 'This list is empty.'}</div> : <div className={styles.itemGrid}>
      {items.map((item) => <div className={styles.itemCard} key={item.id} onClick={() => navigate(`/show/${encodeURIComponent(item.itemId)}`)}>
        {item.posterUrl && <img src={item.posterUrl} alt="" className={styles.itemPoster} />}
        <strong>{item.title}</strong>
        {item.genres.length > 0 && <span className={styles.itemGenres}>{item.genres.join(' · ')}</span>}
        <button className={styles.deleteButton} type="button" onClick={async (event) => { event.stopPropagation(); const updated = await removeListItem(list.id, item.itemId); setList(updated); setDisplayItems((current) => current.filter((displayItem) => displayItem.id !== item.id)) }}>Remove</button>
      </div>)}
    </div>}
  </section></main>
}
