import { useCallback, useState } from 'react'
import { DEFAULT_LOCATION, type FishingLocation } from '../data/locations'

const LOCATION_KEY = 'pesca:location'
const RECENTS_KEY  = 'pesca:recents'
const MAX_RECENTS  = 5

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function isValidLocation(v: unknown): v is FishingLocation {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    typeof o.lat === 'number' &&
    typeof o.lon === 'number'
  )
}

function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignorar */ }
}

export function useLocation() {
  const [location, setLocationState] = useState<FishingLocation>(() => {
    const s = readJson<unknown>(LOCATION_KEY, null)
    return isValidLocation(s) ? s : DEFAULT_LOCATION
  })

  const [recents, setRecentsState] = useState<FishingLocation[]>(() =>
    readJson<unknown[]>(RECENTS_KEY, []).filter(isValidLocation),
  )

  const setLocation = useCallback((loc: FishingLocation) => {
    setLocationState(loc)
    save(LOCATION_KEY, loc)
    setRecentsState(prev => {
      const next = [loc, ...prev.filter(l => l.id !== loc.id)].slice(0, MAX_RECENTS)
      save(RECENTS_KEY, next)
      return next
    })
  }, [])

  const removeRecent = useCallback((id: string) => {
    setRecentsState(prev => {
      const next = prev.filter(l => l.id !== id)
      save(RECENTS_KEY, next)
      return next
    })
  }, [])

  return { location, setLocation, recents, removeRecent }
}
