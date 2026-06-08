import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const svgPath = path.join(__dirname, 'public', 'favicon.svg')
const buildDir = path.join(__dirname, 'build')

if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true })
}

const svgBuffer = fs.readFileSync(svgPath)

const sizes = [16, 24, 32, 48, 64, 128, 256, 512]

for (const size of sizes) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(path.join(buildDir, `icon-${size}x${size}.png`))
  console.log(`Generated icon-${size}x${size}.png`)
}

await sharp(svgBuffer)
  .resize(256, 256)
  .png()
  .toFile(path.join(buildDir, 'icon.png'))
console.log('Generated icon.png (256x256)')

console.log('All icons generated!')
