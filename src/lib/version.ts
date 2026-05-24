export const APP_VERSION = '1.1.0'

export interface NotaVersion {
  version: string
  items:   string[]
}

export const NOTAS_ACTUALES: NotaVersion = {
  version: '1.1.0',
  items: [
    'Desglose del score de pesca: tocá el gauge para ver qué factores definen tu puntaje y cuánto suma cada uno',
    'Notas de versión: a partir de ahora, al instalar cada actualización vas a ver exactamente qué hay de nuevo',
  ],
}
