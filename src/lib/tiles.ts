/** Convierte lat/lon a coordenadas de tile OSM para un nivel de zoom. */
export function latLonToTile(lat: number, lon: number, zoom: number) {
  const n = Math.pow(2, zoom)
  const x = Math.floor(((lon + 180) / 360) * n)
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n)
  return { x, y }
}

export interface BoundingBox {
  north: number
  south: number
  east: number
  west: number
}

/** Estima la cantidad de tiles para un bounding box y rango de zooms. */
export function estimarTiles(bbox: BoundingBox, zoomMin: number, zoomMax: number): number {
  let total = 0
  for (let z = zoomMin; z <= zoomMax; z++) {
    const topLeft     = latLonToTile(bbox.north, bbox.west, z)
    const bottomRight = latLonToTile(bbox.south, bbox.east, z)
    const cols = Math.abs(bottomRight.x - topLeft.x) + 1
    const rows = Math.abs(bottomRight.y - topLeft.y) + 1
    total += cols * rows
  }
  return total
}

/** Tamaño promedio por tile OSM en MB (estimación conservadora). */
const MB_POR_TILE = 0.015

export function estimarMB(tiles: number): number {
  return tiles * MB_POR_TILE
}

export interface TileDescriptor {
  key: string
  url: string
  urlTemplate: string
  x: number
  y: number
  z: number
  createdAt: number
}

const SUBDOMAINS = ['a', 'b', 'c']

/** Genera la lista de TileDescriptors para un bbox + rango de zoom. */
export function generarTiles(
  bbox: BoundingBox,
  zoomMin: number,
  zoomMax: number,
  urlTemplate = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
): TileDescriptor[] {
  const now = Date.now()
  const tiles: TileDescriptor[] = []
  for (let z = zoomMin; z <= zoomMax; z++) {
    const topLeft     = latLonToTile(bbox.north, bbox.west, z)
    const bottomRight = latLonToTile(bbox.south, bbox.east, z)
    const xMin = Math.min(topLeft.x, bottomRight.x)
    const xMax = Math.max(topLeft.x, bottomRight.x)
    const yMin = Math.min(topLeft.y, bottomRight.y)
    const yMax = Math.max(topLeft.y, bottomRight.y)
    let si = 0
    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        const s = SUBDOMAINS[si % SUBDOMAINS.length]
        si++
        const url = urlTemplate
          .replace('{s}', s)
          .replace('{z}', String(z))
          .replace('{x}', String(x))
          .replace('{y}', String(y))
        tiles.push({ key: url, url, urlTemplate, x, y, z, createdAt: now })
      }
    }
  }
  return tiles
}
