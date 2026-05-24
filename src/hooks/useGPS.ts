import { useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'

export interface PosicionGPS {
  lat: number
  lon: number
  velocidad_kts: number
  precision_m: number
  heading: number | null
  ts: number
}

export interface EstadoGPS {
  posicion: PosicionGPS | null
  error: string | null
  permiso: 'desconocido' | 'concedido' | 'denegado'
}

const MS_IN_KTS = 1.94384 // 1 m/s = 1.94384 knots

export function useGPS(activo: boolean): EstadoGPS {
  const [estado, setEstado] = useState<EstadoGPS>({
    posicion: null,
    error: null,
    permiso: 'desconocido',
  })
  const watchIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!activo) return

    let cancelled = false

    async function iniciarWatch() {
      // En Capacitor nativo pedimos permiso explícito
      if (Capacitor.isNativePlatform()) {
        const perm = await Geolocation.requestPermissions()
        if (perm.location !== 'granted') {
          if (!cancelled) setEstado(e => ({ ...e, permiso: 'denegado', error: 'Permiso de ubicación denegado.' }))
          return
        }
      }

      if (!cancelled) setEstado(e => ({ ...e, permiso: 'concedido' }))

      if (Capacitor.isNativePlatform()) {
        // Capacitor Geolocation watch
        const id = await Geolocation.watchPosition(
          { enableHighAccuracy: true, timeout: 10000 },
          (pos, err) => {
            if (cancelled) return
            if (err || !pos) {
              setEstado(e => ({ ...e, error: err?.message ?? 'Error GPS' }))
              return
            }
            setEstado(e => ({
              ...e,
              error: null,
              posicion: {
                lat: pos.coords.latitude,
                lon: pos.coords.longitude,
                velocidad_kts: (pos.coords.speed ?? 0) * MS_IN_KTS,
                precision_m: pos.coords.accuracy,
                heading: pos.coords.heading ?? null,
                ts: pos.timestamp,
              },
            }))
          },
        )
        watchIdRef.current = id
      } else {
        // Fallback web — navigator.geolocation para desarrollo en desktop
        if (!navigator.geolocation) {
          if (!cancelled) setEstado(e => ({ ...e, error: 'GPS no disponible en este navegador.' }))
          return
        }
        const id = navigator.geolocation.watchPosition(
          pos => {
            if (cancelled) return
            setEstado(e => ({
              ...e,
              error: null,
              posicion: {
                lat: pos.coords.latitude,
                lon: pos.coords.longitude,
                velocidad_kts: (pos.coords.speed ?? 0) * MS_IN_KTS,
                precision_m: pos.coords.accuracy,
                heading: pos.coords.heading ?? null,
                ts: pos.timestamp,
              },
            }))
          },
          err => {
            if (!cancelled) setEstado(e => ({ ...e, error: err.message }))
          },
          { enableHighAccuracy: true },
        )
        // Guardamos como string para unificar la interfaz
        watchIdRef.current = String(id)
      }
    }

    iniciarWatch()

    return () => {
      cancelled = true
      if (watchIdRef.current != null) {
        if (Capacitor.isNativePlatform()) {
          Geolocation.clearWatch({ id: watchIdRef.current })
        } else {
          navigator.geolocation.clearWatch(Number(watchIdRef.current))
        }
        watchIdRef.current = null
      }
    }
  }, [activo])

  return estado
}
