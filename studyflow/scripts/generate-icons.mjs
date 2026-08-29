// One-off script: rasterizes public/favicon.svg into the full PWA PNG icon set.
// Run with: node scripts/generate-icons.mjs (requires: npm i --no-save sharp)
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svg = readFileSync(join(root, 'public', 'favicon.svg'))

const outDir = join(root, 'public')

// Standard "any" icon — keeps the rounded-rect look of the favicon.
for (const size of [192, 512]) {
  await sharp(svg, { density: 96 * (512 / 32) })
    .resize(size, size)
    .png()
    .toFile(join(outDir, `pwa-${size}.png`))
}

// Maskable icons: full-bleed square background, logo scaled into the safe
// zone (content within the central 80% survives circular/rounded masks).
const safeZone = 0.62 // logo occupies 62% of the canvas
for (const size of [192, 512]) {
  const inner = Math.round(size * safeZone)
  const logo = await sharp(svg, { density: 96 * (512 / 32) })
    .resize(inner, inner)
    .png()
    .toBuffer()
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: '#5366DC',
    },
  })
    .composite([{ input: logo, gravity: 'centre' }])
    .png()
    .toFile(join(outDir, `pwa-maskable-${size}.png`))
}

// Apple touch icon: iOS applies its own rounded mask, so full-bleed square,
// logo slightly larger than the maskable safe zone.
const iosSize = 180
const iosInner = Math.round(iosSize * 0.72)
const iosLogo = await sharp(svg, { density: 96 * (512 / 32) })
  .resize(iosInner, iosInner)
  .png()
  .toBuffer()
await sharp({
  create: { width: iosSize, height: iosSize, channels: 4, background: '#5366DC' },
})
  .composite([{ input: iosLogo, gravity: 'centre' }])
  .png()
  .toFile(join(outDir, 'apple-touch-icon.png'))

console.log('Icons generated:')
console.log('  pwa-192.png, pwa-512.png')
console.log('  pwa-maskable-192.png, pwa-maskable-512.png')
console.log('  apple-touch-icon.png')
