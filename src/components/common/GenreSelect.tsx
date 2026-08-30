import { useEffect, useRef, useState } from 'react'
import styles from '../../App.module.css'
export default function GenreSelect({ genres, counts, loading, value, onChange }: { genres: string[]; counts: Record<string, number>; loading?: boolean; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close); document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape) }
  }, [])
  const label = loading ? 'Loading…' : value || 'All genres'
  return <div className={styles.genreDropdown} ref={ref}>
    <button className={`${styles.genreButton} ${value ? styles.genreButtonActive : ''}`} type="button" disabled={loading} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)}>{label}<span className={styles.genreChevron} aria-hidden="true" /></button>
    {open && <div className={styles.genreMenu} role="listbox" aria-label="Filter by genre">
      <button className={styles.genreOption} type="button" onClick={() => { onChange(''); setOpen(false) }}>All genres</button>
      {genres.map((genre) => <button className={styles.genreOption} type="button" key={genre} onClick={() => { onChange(genre); setOpen(false) }}>{genre} ({counts[genre] ?? 0})</button>)}
    </div>}
  </div>
}
