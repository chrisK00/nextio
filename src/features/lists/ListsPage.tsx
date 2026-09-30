import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import appStyles from '../../App.module.css'
import styles from './ListsPage.module.css'
import { createUserList, deleteUserList, getUserLists } from '../../services/api'
import type { UserList } from '../../services/apiTypes'
import FilterButton from '../../components/common/FilterButton'

export default function ListsPage() {
  const navigate = useNavigate()
  const [lists, setLists] = useState<UserList[]>([])
  const [listMediaType, setListMediaType] = useState<'movie' | 'tv'>('movie')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [mediaType, setMediaType] = useState<'tv' | 'movie'>('movie')
  const [isCreateExpanded, setIsCreateExpanded] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  const refresh = useCallback(async (mediaType: 'movie' | 'tv' = listMediaType) => {
    setLists(await getUserLists(mediaType))
  }, [listMediaType])

  useEffect(() => {
    let cancelled = false
    const fetchLists = async () => {
      try {
        const nextLists = await getUserLists(listMediaType)
        if(cancelled) return
        setLists(nextLists)
        setError('')
      } catch(e: unknown) {
        if(!cancelled) setError(e instanceof Error ? e.message : 'Could not load lists.')
      } finally {
        if(!cancelled) setLoading(false)
      }
    }
    void fetchLists()
    return () => { cancelled = true }
  }, [listMediaType, reloadKey])

  function changeListMediaType(nextMediaType: 'movie' | 'tv') {
    setLoading(true)
    setError('')
    setListMediaType(nextMediaType)
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    if(!name.trim()) return
    try {
      setError('')
      await createUserList(name.trim(), description.trim() || undefined, mediaType)
      setName('')
      setDescription('')
      setIsCreateExpanded(false)
      await refresh(listMediaType)
    } catch(e) {
      setError(e instanceof Error ? e.message : 'Could not create list')
    }
  }

  async function handleDelete(id: string) {
    if(!window.confirm('Delete this list? This cannot be undone.')) return
    await deleteUserList(id)
    setLists((current) => current.filter((list) => list.id !== id))
  }

  return (
    <main className={appStyles.mainPanel}>
      <section className={styles.page}>
        <button
          className={styles.createToggle}
          type="button"
          aria-expanded={isCreateExpanded}
          onClick={() => setIsCreateExpanded((expanded) => !expanded)}
        >
          {isCreateExpanded ? 'Cancel' : 'New list'}
        </button>
        {isCreateExpanded && (
          <form onSubmit={handleCreate} className={styles.form}>
            <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="List name" required />
            <input className={styles.input} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" />
            <select className={styles.input} value={mediaType} onChange={(e) => setMediaType(e.target.value as 'tv' | 'movie')}>
              <option value="tv">TV shows</option>
              <option value="movie">Movies</option>
            </select>
            <button className={styles.createButton} type="submit">Create list</button>
            {error && <span>{error}</span>}
          </form>
        )}
        <div className={styles.mediaFilters} role="tablist" aria-label="List type">
          <FilterButton label="Movies" active={listMediaType === 'movie'} onClick={() => changeListMediaType('movie')} />
          <FilterButton label="TV shows" active={listMediaType === 'tv'} onClick={() => changeListMediaType('tv')} />
        </div>
        {loading ? <div className={styles.emptyState} role="status">Loading lists...</div> : error ? (
          <div className={styles.emptyState} role="alert">
            <p>Could not load lists: {error}</p>
            <button className={appStyles.secondaryButton} type="button" onClick={() => { setLoading(true); setReloadKey((key) => key + 1) }}>Try again</button>
          </div>
        ) : lists.length === 0 ? <div className={styles.emptyState}>No {listMediaType === 'movie' ? 'movie' : 'TV'} lists yet. Create one above.</div> : (
          <div className={styles.listGrid}>
            {lists.map((list) => (
              <div key={list.id} className={styles.listCard} onClick={() => navigate(`/lists/${list.id}`)}>
                <div><strong className={styles.listName}>{list.name}</strong><div className={styles.listMeta}>{list.mediaType === 'movie' ? 'Movies' : 'TV shows'} · {list.items.length} items</div>{list.description && <div className={styles.description}>{list.description}</div>}</div>
                <button className={styles.deleteButton} type="button" onClick={(event) => { event.stopPropagation(); void handleDelete(list.id) }}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
