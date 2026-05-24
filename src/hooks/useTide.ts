import { useEffect, useState } from 'react'
import { detectarExtremos, proximosExtremos, type ExtremoMarea } from '../lib/tide'

export interface EstadoMarea {
  data: ExtremoMarea[] | null
  loading: boolean
  error: string | null
  /** true cuando la API respondió pero no hay datos de marea (ej. tierra adentro) */
  unsupported: boolean
}

interface MarineResponse {
  utc_offset_seconds?: number
  hourly?: {
    time?: string[]
    sea_level_height_msl?: (number | null)[]
  }
}

export function useTide(lat: number, lon: number): EstadoMarea {
  const [state, setState] = useState<EstadoMarea>({
    data: null,
    loading: true,
    error: null,
    unsupported: false,
  })

  useEffect(() => {
    let cancelled = false
    setState({ data: null, loading: true, error: null, unsupported: false })

    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: 'sea_level_height_msl',
      timezone: 'auto',
      forecast_days: '3',
    })
    const url = `https://marine-api.open-meteo.com/v1/marine?${params}`

    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<MarineResponse>
      })
      .then(json => {
        if (cancelled) return
        const times   = json.hourly?.time ?? []
        const heights = json.hourly?.sea_level_height_msl ?? []
        const offset  = json.utc_offset_seconds ?? 0

        const todoNull = heights.length > 0 && heights.every(h => h == null)
        if (!heights.length || todoNull) {
          setState({ data: null, loading: false, error: null, unsupported: true })
          return
        }

        const extremos = detectarExtremos(times, heights, offset)
        const proximos = proximosExtremos(extremos, Date.now(), 4)

        setState({
          data: proximos,
          loading: false,
          error: null,
          unsupported: proximos.length === 0,
        })
      })
      .catch((e: unknown) => {
        if (cancelled) return
        const msg = e instanceof Error ? e.message : 'Error de conexión'
        setState({ data: null, loading: false, error: msg, unsupported: false })
      })

    return () => {
      cancelled = true
    }
  }, [lat, lon])

  return state
}
