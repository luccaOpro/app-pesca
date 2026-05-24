export interface PuntoGPS {
  lat: number
  lon: number
  ts: number
  velocidad_kts?: number
}

export interface Track {
  id: string
  nombre: string
  fecha: number
  puntos: PuntoGPS[]
  distancia_nm: number
  duracion_s: number
}

const STORAGE_KEY = 'pesca:tracks'

function readTracks(): Track[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Track[]) : []
  } catch {
    return []
  }
}

function saveTracks(tracks: Track[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tracks))
  } catch { /* quota exceeded — ignorar */ }
}

export function getTracks(): Track[] {
  return readTracks()
}

export function saveTrack(track: Track) {
  const tracks = readTracks()
  saveTracks([track, ...tracks])
}

export function deleteTrack(id: string) {
  saveTracks(readTracks().filter(t => t.id !== id))
}

/** Distancia Haversine entre dos puntos en millas náuticas. */
export function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065 // radio terrestre en nm
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatDuracion(segundos: number): string {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

export function formatFechaTrack(ts: number): string {
  return new Date(ts).toLocaleDateString('es-AR', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

// ─── GPX export ──────────────────────────────────────────────────────────────

function xmlEscape(s: string): string {
  return s.replace(/[<>&"']/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
  }[c] as string))
}

/**
 * Serializa un Track al formato GPX 1.1, compatible con Google Earth, Garmin,
 * OruxMaps, etc.
 */
export function trackToGPX(track: Track): string {
  const isoFecha = new Date(track.fecha).toISOString()
  const trkpts = track.puntos.map(p => {
    const t = new Date(p.ts).toISOString()
    const speed = p.velocidad_kts != null
      ? `\n        <speed>${(p.velocidad_kts / 1.94384).toFixed(2)}</speed>`
      : ''
    return `      <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lon.toFixed(6)}">
        <time>${t}</time>${speed}
      </trkpt>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1"
     creator="Tormenta de Facha"
     xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${xmlEscape(track.nombre)}</name>
    <time>${isoFecha}</time>
  </metadata>
  <trk>
    <name>${xmlEscape(track.nombre)}</name>
    <desc>Distancia: ${track.distancia_nm.toFixed(2)} mn · Duración: ${formatDuracion(track.duracion_s)}</desc>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>
`
}

/**
 * Descarga (browser) o comparte (nativo, si Web Share API soporta files) un GPX.
 */
export async function exportTrackGPX(track: Track): Promise<void> {
  const gpx     = trackToGPX(track)
  const safeName = track.nombre.replace(/[^\w\d\-_ ]/g, '').replace(/\s+/g, '_') || 'track'
  const filename = `${safeName}.gpx`
  const blob = new Blob([gpx], { type: 'application/gpx+xml' })

  // Web Share API con archivos (Android Chrome)
  type NavShareFiles = Navigator & { canShare?: (d: { files?: File[] }) => boolean; share?: (d: { files?: File[]; title?: string; text?: string }) => Promise<void> }
  const n = navigator as NavShareFiles
  const file = new File([blob], filename, { type: 'application/gpx+xml' })

  if (n.canShare && n.share && n.canShare({ files: [file] })) {
    try {
      await n.share({ files: [file], title: track.nombre, text: `Track: ${track.nombre}` })
      return
    } catch { /* user canceled — caer al fallback */ }
  }

  // Fallback: download link
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
