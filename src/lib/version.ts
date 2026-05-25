export const APP_VERSION = '1.3.0'

export interface NotaVersion {
  version: string
  items:   string[]
}

export const NOTAS_ACTUALES: NotaVersion = {
  version: '1.3.0',
  items: [
    'Ajustes: engranaje en el inicio para buscar actualizaciones sin cerrar la app',
    'Mapa con 4 capas: Estándar, Satelital (imagen real), Oceánico (batimetría) y Oscuro',
    'Panel de Capas integra cartas náuticas y capa de capturas en un solo lugar',
  ],
}
