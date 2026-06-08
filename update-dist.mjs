import { 
  existsSync, mkdirSync, rmSync, copyFileSync, 
  readdirSync, statSync, readFileSync 
} from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = __dirname
const releaseDir = path.join(rootDir, 'release')
const targetDir = path.join(releaseDir, 'win-unpacked')
const resourcesDir = path.join(targetDir, 'resources')
const appDir = path.join(resourcesDir, 'app')

function copyDir(src, dest) {
  if (!existsSync(src)) return
  mkdirSync(dest, { recursive: true })
  const entries = readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    try {
      if (entry.isDirectory() && !entry.isSymbolicLink()) {
        copyDir(srcPath, destPath)
      } else if (entry.isFile() || entry.isSymbolicLink()) {
        copyFileSync(srcPath, destPath)
      }
    } catch (e) {}
  }
}

console.log('=== Updating dist/ in resources ===')
if (existsSync(appDir)) {
  const oldDist = path.join(appDir, 'dist')
  if (existsSync(oldDist)) {
    rmSync(oldDist, { recursive: true, force: true })
  }
  copyDir(path.join(rootDir, 'dist'), oldDist)
  console.log('Done: dist updated')
} else {
  console.log('WARN: No app dir found')
}

console.log('\n=== Replacing executable with Chinese name ===')
const electronExe = path.join(targetDir, 'electron.exe')
const cnExe = path.join(targetDir, '时光簿.exe')
if (existsSync(electronExe)) {
  try {
    if (existsSync(cnExe)) {
      rmSync(cnExe, { force: true })
    }
    copyFileSync(electronExe, cnExe)
    console.log('Done: 时光簿.exe created')
  } catch (e) {
    console.log('Skip renaming (file locked):', e.message)
  }
}
