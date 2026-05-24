export interface FishingLocation {
  id: string
  name: string
  lat: number
  lon: number
  preset: boolean
}

export const PRESET_LOCATIONS: FishingLocation[] = [
  { id: 'bsas-puerto', name: 'Buenos Aires (Puerto)', lat: -34.6037, lon: -58.3816, preset: true },
  { id: 'tigre',       name: 'Tigre / Delta',         lat: -34.4264, lon: -58.5793, preset: true },
  { id: 'san-isidro',  name: 'San Isidro',            lat: -34.4699, lon: -58.5128, preset: true },
  { id: 'san-pedro',   name: 'San Pedro',             lat: -33.6803, lon: -59.6661, preset: true },
  { id: 'la-plata',    name: 'La Plata / Punta Lara', lat: -34.9215, lon: -57.9545, preset: true },
]

export const DEFAULT_LOCATION = PRESET_LOCATIONS[0]
