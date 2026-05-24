import { useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { FileOpener } from '@capacitor-community/file-opener'
import { APP_VERSION } from '../lib/version'

const VERSION_URL =
  'https://raw.githubusercontent.com/luccaOpro/app-pesca/main/version.json'

export interface UpdateInfo {
  version: string
  apk_url: string
  notas?: string
}

function isNewer(remote: string, local: string): boolean {
  const parse = (v: string) => v.split('.').map(Number)
  const [ma, mi, pa] = parse(remote)
  const [la, li, lp] = parse(local)
  if (ma !== la) return ma > la
  if (mi !== li) return mi > li
  return pa > lp
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function useAppUpdate() {
  const [update,       setUpdate]       = useState<UpdateInfo | null>(null)
  const [progreso,     setProgreso]     = useState(0)       // 0-100
  const [instalando,   setInstalando]   = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    fetch(VERSION_URL, { cache: 'no-store' })
      .then(r => r.json() as Promise<UpdateInfo>)
      .then(info => { if (isNewer(info.version, APP_VERSION)) setUpdate(info) })
      .catch(() => {})
  }, [])

  async function instalar() {
    if (!update) return
    setInstalando(true)
    setProgreso(0)
    setError(null)

    try {
      // Descargar con progreso
      abortRef.current = new AbortController()
      const response = await fetch(update.apk_url, { signal: abortRef.current.signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const total  = Number(response.headers.get('content-length') ?? 0)
      const reader = response.body!.getReader()
      const chunks: Uint8Array<ArrayBuffer>[] = []
      let loaded = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        loaded += value.length
        if (total > 0) setProgreso(Math.round((loaded / total) * 100))
      }

      setProgreso(100)

      // Armar Blob y convertir a base64
      const blob   = new Blob(chunks, { type: 'application/vnd.android.package-archive' })
      const base64 = await blobToBase64(blob)

      // Guardar en caché del sistema
      const { uri } = await Filesystem.writeFile({
        path:      'tormenta-update.apk',
        data:      base64,
        directory: Directory.Cache,
      })

      // Abrir con el instalador de Android
      await FileOpener.open({
        filePath:        uri,
        contentType:     'application/vnd.android.package-archive',
        openWithDefault: true,
      })
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      setError('Error al descargar. Verificá tu conexión.')
      console.error(e)
    } finally {
      setInstalando(false)
    }
  }

  function cancelar() {
    abortRef.current?.abort()
    setInstalando(false)
    setProgreso(0)
  }

  return { update, progreso, instalando, error, instalar, cancelar }
}
