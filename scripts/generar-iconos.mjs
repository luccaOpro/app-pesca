/**
 * Genera todos los tamaños de ícono para Android.
 * Fuente: Downloads/ChatGPT Image 24 may 2026, 01_31_00.png
 *
 * Crea:
 *   - ic_launcher.png       (ícono legacy, todas las densidades)
 *   - ic_launcher_round.png (ícono circular, todas las densidades)
 *   - ic_launcher_foreground.png (capa delantera adaptive icon, todas las densidades)
 *
 * El fondo del ícono adaptativo se define en ic_launcher_background.xml (#0B1928).
 */

import sharp from 'sharp'
import path  from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const SRC = 'C:/Users/Lucca/Downloads/ChatGPT Image 24 may 2026, 01_31_00.png'
const RES  = path.join(ROOT, 'android/app/src/main/res')

// Color de fondo del ícono — #0B1928 (navy de la app)
const BG_COLOR = { r: 11, g: 25, b: 40, alpha: 1 }

// ── Tamaños de ícono legacy ──────────────────────────────────────────────────
const LEGACY = [
  { dir: 'mipmap-mdpi',    size: 48  },
  { dir: 'mipmap-hdpi',    size: 72  },
  { dir: 'mipmap-xhdpi',   size: 96  },
  { dir: 'mipmap-xxhdpi',  size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
]

// ── Tamaños foreground adaptive icon ────────────────────────────────────────
// Android usa 108dp para el foreground; el contenido "seguro" está en el centro
// de 72dp (66.67%). Acá generamos el foreground full 108dp con la imagen
// centrada en el área segura — así el shape mask no corta el diseño.
const FOREGROUND = [
  { dir: 'mipmap-mdpi',    size: 108 },
  { dir: 'mipmap-hdpi',    size: 162 },
  { dir: 'mipmap-xhdpi',   size: 216 },
  { dir: 'mipmap-xxhdpi',  size: 324 },
  { dir: 'mipmap-xxxhdpi', size: 432 },
]

/** Crea una máscara SVG circular para cortar el ícono redondo */
function circleMask(size) {
  const r = size / 2
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <circle cx="${r}" cy="${r}" r="${r}" fill="white"/>
    </svg>`
  )
}

async function main() {
  console.log('🎨 Generando íconos Android...\n')

  // 1. Íconos legacy (ic_launcher.png y ic_launcher_round.png)
  for (const { dir, size } of LEGACY) {
    const destDir = path.join(RES, dir)

    // ic_launcher.png — cuadrado, con fondo navy
    const outSquare = path.join(destDir, 'ic_launcher.png')
    await sharp(SRC)
      .resize(size, size, { fit: 'cover' })
      .flatten({ background: BG_COLOR })
      .png()
      .toFile(outSquare)
    console.log(`  ✓ ${dir}/ic_launcher.png (${size}×${size})`)

    // ic_launcher_round.png — circular con transparencia
    const outRound = path.join(destDir, 'ic_launcher_round.png')
    const mask = circleMask(size)
    await sharp(SRC)
      .resize(size, size, { fit: 'cover' })
      .flatten({ background: BG_COLOR })  // aplana por si el source tiene alfa
      .composite([{ input: mask, blend: 'dest-in' }])
      .png()
      .toFile(outRound)
    console.log(`  ✓ ${dir}/ic_launcher_round.png (${size}×${size})`)
  }

  // 2. Foreground del adaptive icon
  // La imagen ocupa el 88% del foreground — dejamos un 6% de padding en cada lado
  // para que el shape mask no toque los bordes del diseño.
  for (const { dir, size } of FOREGROUND) {
    const contentSize = Math.round(size * 0.88)
    const offset      = Math.round((size - contentSize) / 2)

    const outFg = path.join(RES, dir, 'ic_launcher_foreground.png')

    await sharp(SRC)
      .resize(contentSize, contentSize, { fit: 'cover' })
      .extend({
        top:    offset,
        bottom: offset,
        left:   offset,
        right:  offset,
        background: BG_COLOR,
      })
      .png()
      .toFile(outFg)

    console.log(`  ✓ ${dir}/ic_launcher_foreground.png (${size}×${size}, contenido ${contentSize}×${contentSize})`)
  }

  console.log('\n✅ Todos los íconos generados correctamente.')
}

main().catch(err => { console.error('Error:', err); process.exit(1) })
