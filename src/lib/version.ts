export const APP_VERSION = '1.2.0'

export interface NotaVersion {
  version: string
  items:   string[]
}

export const NOTAS_ACTUALES: NotaVersion = {
  version: '1.2.0',
  items: [
    'Spots tipados: Captura, Buen lugar, Enganche, Peligro, Bajada y Nota',
    'Cada tipo tiene su propio ícono y color en el mapa',
    'El nombre del spot ahora es opcional',
  ],
}
