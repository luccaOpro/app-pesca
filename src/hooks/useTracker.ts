import { useEffect, useRef, useState } from 'react'
import { haversineNm, type PuntoGPS } from '../lib/tracks'
import { useGPS } from './useGPS'

export interface EstadoTracker {
  puntos: PuntoGPS[]
  distancia_nm: number
  velocidad_kts: number
  duracion_s: number
  activo: boolean
  error: string | null
}

export function useTracker(activo: boolean): EstadoTracker {
  const gps = useGPS(activo)
  const startTimeRef = useRef<number | null>(null)
  const [puntos, setPuntos] = useState<PuntoGPS[]>([])
  const [distancia, setDistancia] = useState(0)
  const [duracion, setDuracion] = useState(0)

  // Tick de duración cada segundo
  useEffect(() => {
    if (!activo) return
    startTimeRef.current = Date.now()
    const interval = setInterval(() => {
      if (startTimeRef.current) {
        setDuracion(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }
    }, 1000)
    return () => {
      clearInterval(interval)
      startTimeRef.current = null
      setPuntos([])
      setDistancia(0)
      setDuracion(0)
    }
  }, [activo])

  // Acumular puntos GPS
  useEffect(() => {
    if (!activo || !gps.posicion) return
    const pos = gps.posicion

    setPuntos(prev => {
      const ultimo = prev[prev.length - 1]
      // Ignorar si el punto está a menos de 5 m del anterior (ruido GPS)
      if (ultimo) {
        const distIncremental = haversineNm(ultimo.lat, ultimo.lon, pos.lat, pos.lon)
        if (distIncremental * 1852 < 5) return prev // menos de 5 metros
        setDistancia(d => d + distIncremental)
      }
      return [...prev, { lat: pos.lat, lon: pos.lon, ts: pos.ts, velocidad_kts: pos.velocidad_kts }]
    })
  }, [activo, gps.posicion])

  return {
    puntos,
    distancia_nm: distancia,
    velocidad_kts: gps.posicion?.velocidad_kts ?? 0,
    duracion_s: duracion,
    activo,
    error: gps.error,
  }
}
