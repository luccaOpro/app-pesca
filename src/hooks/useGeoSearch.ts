import { useEffect, useRef, useState } from 'react'
import type { FishingLocation } from '../data/locations'

interface GeoResult {
  id: number
  name: string
  latitude: number
  longitude: number
  admin1?: string
  country_code?: string
}

interface GeoResponse {
  results?: GeoResult[]
}

function geoResultToLocation(r: GeoResult): FishingLocation {
  const parts = [r.name]
  if (r.admin1) parts.push(r.admin1)
  if (r.country_code && r.country_code !== 'AR') parts.push(r.country_code)
  return {
    id: `geo-${r.id}`,
    name: parts.join(', '),
    lat: r.latitude,
    lon: r.longitude,
    preset: false,
  }
}

export function useGeoSearch(query: string) {
  const [results, setResults] = useState<FishingLocation[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setSearching(false)
      return
    }

    setSearching(true)
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams({
        name: q,
        count: '8',
        language: 'es',
        format: 'json',
      })
      fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`)
        .then((r) => r.json() as Promise<GeoResponse>)
        .then((json) => {
          setResults((json.results ?? []).map(geoResultToLocation))
          setSearching(false)
        })
        .catch(() => {
          setResults([])
          setSearching(false)
        })
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  return { results, searching }
}
