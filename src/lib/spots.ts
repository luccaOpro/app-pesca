export interface Spot {
  id: string
  nombre: string
  lat: number
  lon: number
  fecha: number
}

const KEY = 'pesca:spots'

export function getSpots(): Spot[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}

export function saveSpot(s: Spot): void {
  const arr = getSpots()
  arr.push(s)
  localStorage.setItem(KEY, JSON.stringify(arr))
}

export function deleteSpot(id: string): void {
  const arr = getSpots().filter(s => s.id !== id)
  localStorage.setItem(KEY, JSON.stringify(arr))
}
