import { useEffect, useRef, useState } from 'react'
import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { FileOpener } from '@capacitor-community/file-opener'
import { APP_VERSION } from '../lib/version'

const VERSION_URL =
  'https://raw.githubusercontent.com/luccaOpro/app-pesca/main/version.json'

export interface UpdateInfo {
  version: string
  apk_url: string
  notas?:  string
}

function isNewer(remote: string, local: string): boolean {
  const parse = (v: string) => v.split('.').map(Number)
  const [ma, mi, pa] = parse(remote)
  const [la, li, lp] = parse(local)
  if (ma !== la) return ma > la
  if (mi !== li) return mi > li
  return pa > lp
}

export function useAppUpdate() {
  const [update,     setUpdate]     = useState<UpdateInfo | null>(null)
  const [progreso,   setProgreso]   = useState(0)
  const [instalando, setInstalando] = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [checking,   setChecking]   = useState(false)
  const [upToDate,   setUpToDate]   = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    fetch(VERSION_URL, { cache: 'no-store' })
      .then(r => r.json() as Promise<UpdateInfo>)
      .then(info => { if (isNewer(info.version, APP_VERSION)) setUpdate(info) })
      .catch(() => {})
  }, [])

  async function check() {
    if (!Capacitor.isNativePlatform()) return
    setChecking(true)
    setUpToDate(false)
    setError(null)
    try {
      const r    = await fetch(VERSION_URL, { cache: 'no-store' })
      const info = await r.json() as UpdateInfo
      if (isNewer(info.version, APP_VERSION)) {
        setUpdate(info)
      } else {
        setUpdate(null)
        setUpToDate(true)
      }
    } catch {
      setError('No se pudo verificar. Revisá tu conexión.')
    } finally {
      setChecking(false)
    }
  }

  async function instalar() {
    if (!update) return
    setInstalando(true)
    setProgreso(0)
    setError(null)

    // CapacitorHttp no soporta progreso de streaming, animamos suavemente hasta 90 %
    let fake = 0
    timerRef.current = setInterval(() => {
      fake = Math.min(fake + 2, 90)
      setProgreso(fake)
    }, 250)

    try {
      // CapacitorHttp usa la capa nativa de Android → sin restricciones CORS ni redirects problemáticos
      // responseType 'arraybuffer' devuelve base64 puro, listo para Filesystem.writeFile
      const response = await CapacitorHttp.get({
        url:          update.apk_url,
        responseType: 'arraybuffer',
      })

      clearInterval(timerRef.current!)
      timerRef.current = null

      if (response.status !== 200) throw new Error(`HTTP ${response.status}`)

      setProgreso(100)

      const { uri } = await Filesystem.writeFile({
        path:      'tormenta-update.apk',
        data:      response.data as string,
        directory: Directory.Cache,
      })

      await FileOpener.open({
        filePath:        uri,
        contentType:     'application/vnd.android.package-archive',
        openWithDefault: true,
      })
    } catch (e) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      setError('Error al descargar. Verificá tu conexión.')
      console.error(e)
    } finally {
      setInstalando(false)
    }
  }

  function cancelar() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setInstalando(false)
    setProgreso(0)
  }

  return { update, progreso, instalando, error, checking, upToDate, instalar, cancelar, check }
}
