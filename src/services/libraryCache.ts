import type { LibraryResponse, LibraryTvShow } from './apiTypes'

type CachedLibrary = {
  username: string
  library: LibraryResponse<LibraryTvShow>
  cachedAt: string
}

const DATABASE_NAME = 'nextio-offline'
const DATABASE_VERSION = 1
const STORE_NAME = 'tv-libraries'

let databasePromise: Promise<IDBDatabase> | null = null

function normalizeUsername(username: string): string {
  return username.trim()
}

function openDatabase(): Promise<IDBDatabase> {
  if(databasePromise) {
    return databasePromise
  }

  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    if(!('indexedDB' in window)) {
      reject(new Error('IndexedDB is unavailable.'))
      return
    }

    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if(!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'username' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open the offline library store.'))
    request.onblocked = () => reject(new Error('The offline library store is blocked.'))
  })
  const recoverableOpening = opening.catch((error: unknown) => {
    databasePromise = null
    throw error
  })

  databasePromise = recoverableOpening
  return recoverableOpening
}

export async function readCachedLibrary(username: string): Promise<CachedLibrary | null> {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).get(normalizeUsername(username)) as IDBRequest<CachedLibrary | undefined>
    request.onsuccess = () => resolve(request.result ?? null)
    request.onerror = () => reject(request.error ?? new Error('Could not read the offline library.'))
  })
}

export async function writeCachedLibrary(username: string, library: LibraryResponse<LibraryTvShow>): Promise<void> {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const cacheKey = normalizeUsername(username)
    const write = () => store.put({
      username: cacheKey,
      library,
      cachedAt: new Date().toISOString(),
    } satisfies CachedLibrary)

    if(library.items.length > 0) {
      write()
    } else {
      const request = store.get(cacheKey) as IDBRequest<CachedLibrary | undefined>
      request.onsuccess = () => {
        if(!request.result?.library.items.length) {
          write()
        }
      }
      request.onerror = () => transaction.abort()
    }

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save the offline library.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Saving the offline library was aborted.'))
  })
}

export async function deleteCachedLibrary(username: string): Promise<void> {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).delete(normalizeUsername(username))
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not clear the offline library.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Clearing the offline library was aborted.'))
  })
}