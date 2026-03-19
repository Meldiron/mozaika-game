import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(__dirname, '../public')

const logoSvg = readFileSync(resolve(publicDir, 'logo.svg'))

// Generate PNG logo (512x512)
await sharp(logoSvg).resize(512, 512).png().toFile(resolve(publicDir, 'logo.png'))
console.log('✓ logo.png (512x512)')

// Generate logo 192 (for manifest)
await sharp(logoSvg).resize(192, 192).png().toFile(resolve(publicDir, 'logo192.png'))
console.log('✓ logo192.png')

// Generate logo 512 (for manifest)
await sharp(logoSvg).resize(512, 512).png().toFile(resolve(publicDir, 'logo512.png'))
console.log('✓ logo512.png')

// Generate favicon as PNG (browsers support PNG favicons)
await sharp(logoSvg).resize(32, 32).png().toFile(resolve(publicDir, 'favicon.png'))
console.log('✓ favicon.png (32x32)')

// Generate ICO-compatible favicon (48x48 PNG, saved as .ico workaround)
await sharp(logoSvg).resize(48, 48).png().toFile(resolve(publicDir, 'favicon.ico'))
console.log('✓ favicon.ico (48x48)')

// Generate OG image (1200x630) — HTML/Tailwind-style design rendered via SVG
const ogSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0a0a"/>
      <stop offset="100%" stop-color="#171717"/>
    </linearGradient>
    <filter id="blur">
      <feGaussianBlur stdDeviation="8"/>
    </filter>
    <radialGradient id="glow1" cx="20%" cy="30%" r="40%">
      <stop offset="0%" stop-color="#ef4444" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#ef4444" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="80%" cy="70%" r="40%">
      <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow3" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#a855f7" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="#a855f7" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Background glows -->
  <rect width="1200" height="630" fill="url(#glow1)"/>
  <rect width="1200" height="630" fill="url(#glow2)"/>
  <rect width="1200" height="630" fill="url(#glow3)"/>

  <!-- Blurry grid pattern -->
  <g opacity="0.07" filter="url(#blur)">
    ${Array.from({ length: 21 }, (_, i) => `<line x1="${i * 60}" y1="0" x2="${i * 60}" y2="630" stroke="white" stroke-width="1"/>`).join('')}
    ${Array.from({ length: 11 }, (_, i) => `<line x1="0" y1="${i * 60}" x2="1200" y2="${i * 60}" stroke="white" stroke-width="1"/>`).join('')}
  </g>

  <!-- Mini board decoration (left side) -->
  <g transform="translate(180, 205)">
    <rect x="0" y="0" width="60" height="60" rx="8" fill="#ef4444" opacity="0.9"/>
    <rect x="72" y="0" width="60" height="60" rx="8" fill="#a855f7" opacity="0.9"/>
    <rect x="144" y="0" width="60" height="60" rx="8" fill="#3b82f6" opacity="0.9"/>
    <rect x="0" y="72" width="60" height="60" rx="8" fill="#eab308" opacity="0.9"/>
    <rect x="72" y="72" width="60" height="60" rx="8" fill="#10b981" opacity="0.9"/>
    <rect x="144" y="72" width="60" height="60" rx="8" fill="#ef4444" opacity="0.9"/>
    <rect x="0" y="144" width="60" height="60" rx="8" fill="#3b82f6" opacity="0.9"/>
    <rect x="72" y="144" width="60" height="60" rx="8" fill="#eab308" opacity="0.9"/>
    <rect x="144" y="144" width="60" height="60" rx="8" fill="#a855f7" opacity="0.9"/>
    <text x="30" y="40" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="30" fill="white">3</text>
    <text x="102" y="40" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="30" fill="white">1</text>
    <text x="174" y="40" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="30" fill="white">5</text>
    <text x="30" y="112" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="30" fill="#0a0a0a">2</text>
    <text x="102" y="112" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="30" fill="white">6</text>
    <text x="174" y="112" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="30" fill="white">4</text>
    <text x="30" y="184" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="30" fill="white">1</text>
    <text x="102" y="184" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="30" fill="#0a0a0a">3</text>
    <text x="174" y="184" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="30" fill="white">2</text>
  </g>

  <!-- Text content (right side) -->
  <text x="420" y="260" font-family="system-ui,sans-serif" font-weight="800" font-size="72" fill="white">Mozaika Game</text>
  <text x="420" y="320" font-family="system-ui,sans-serif" font-weight="500" font-size="28" fill="#a3a3a3">A strategic dice-placement duel</text>

  <!-- Tagline pills -->
  <g transform="translate(420, 360)">
    <rect x="0" y="0" width="120" height="36" rx="18" fill="#ef4444" opacity="0.2"/>
    <text x="60" y="23" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="600" font-size="14" fill="#ef4444">Multiplayer</text>

    <rect x="132" y="0" width="130" height="36" rx="18" fill="#3b82f6" opacity="0.2"/>
    <text x="197" y="23" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="600" font-size="14" fill="#3b82f6">Split Screen</text>

    <rect x="274" y="0" width="110" height="36" rx="18" fill="#10b981" opacity="0.2"/>
    <text x="329" y="23" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="600" font-size="14" fill="#10b981">Real-time</text>
  </g>

  <!-- Bottom border accent -->
  <rect x="0" y="618" width="400" height="12" fill="#ef4444"/>
  <rect x="400" y="618" width="400" height="12" fill="#3b82f6"/>
  <rect x="800" y="618" width="400" height="12" fill="#10b981"/>
</svg>
`

await sharp(Buffer.from(ogSvg)).resize(1200, 630).png().toFile(resolve(publicDir, 'og.png'))
console.log('✓ og.png (1200x630)')

console.log('\nAll assets generated!')
