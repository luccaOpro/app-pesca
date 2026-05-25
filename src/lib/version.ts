export const APP_VERSION = '1.2.1'

export interface NotaVersion {
  version: string
  items:   string[]
}

export const NOTAS_ACTUALES: NotaVersion = {
  version: '1.2.1',
  items: [
    'Las grabaciones ya no se pierden si el GPS tardó en fijar o el barco estaba quieto',
    'Al detener la grabación aparece un panel con distancia, duración y botón "Ver en Bitácora"',
    'Corrección: la salida se guardaba pero no había forma de saberlo',
  ],
}
