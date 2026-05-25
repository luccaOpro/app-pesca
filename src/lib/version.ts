export const APP_VERSION = '1.1.2'

export interface NotaVersion {
  version: string
  items:   string[]
}

export const NOTAS_ACTUALES: NotaVersion = {
  version: '1.1.2',
  items: [
    'Velocidades de viento ahora en km/h en toda la app',
  ],
}
