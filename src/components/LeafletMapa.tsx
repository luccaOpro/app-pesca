import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-rotate'               // patches L.Map with setBearing()
import { tileLayerOffline } from 'leaflet.offline'

// Fix Leaflet default marker icons con Vite
import iconUrl       from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl     from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)['_getIconUrl']
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })

interface Props {
  center?:     [number, number]
  zoom?:       number
  className?:  string
  onMapReady?: (map: L.Map) => void
}

export function LeafletMapa({
  center = [-34.6, -58.38],
  zoom   = 12,
  className,
  onMapReady,
}: Props) {
  const divRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!divRef.current || mapRef.current) return

    const map = L.map(divRef.current, {
      center,
      zoom,
      zoomControl: false,   // usamos botones propios en MapaNautico
      // @ts-ignore — opción añadida por leaflet-rotate
      rotate: true,
      bearing: 0,
    })

    tileLayerOffline('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OSM</a>',
      maxZoom: 18,
      subdomains: ['a', 'b', 'c'],
    }).addTo(map)

    mapRef.current = map
    onMapReady?.(map)

    return () => {
      map.remove()
      mapRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={divRef}
      className={className}
      style={{ width: '100%', height: '100%', minHeight: 0 }}
    />
  )
}
