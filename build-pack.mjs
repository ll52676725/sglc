import { renameSync, existsSync, mkdirSync, rmSync } from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = __dirname
const releaseDir = path.join(rootDir, 'release')
const tmpDir = path.join(releaseDir, 'win-unpacked.tmp')
const targetDir = path.join(releaseDir, 'win-unpacked')

process.env.ELECTRON_CACHE = path.join(rootDir, '.electron-cache')
process.env.ELECTRON_BUILDER_CACHE = path.join(rootDir, '.electron-cache')
process.env.LOCALAPPDATA = path.join(rootDir, '.cache-appdata')
process.env.APPDATA = path.join(rootDir, '.cache-appdata')

mkdirSync(process.env.LOCALAPPDATA, { recursive: true })
mkdirSync(path.join(process.env.LOCALAPPDATA, 'electron'), { recursive: true })
mkdirSync(process.env.ELECTRON_CACHE, { recursive: true })

console.log('=== Cleaning up previous build artifacts ===')
if (existsSync(targetDir)) {
  rmSync(targetDir, { recursive: true, force: true })
}

console.log('=== Checking for partial electron extraction ===')
if (existsSync(tmpDir)) {
  try {
    rmSync(tmpDir, { recursive: true, force: true })
    console.log('Removed old win-unpacked.tmp directory')
  } catch (e) {
    console.log('Remove failed, trying to rename to target directly...')
    try {
      renameSync(tmpDir, targetDir)
      console.log('Renamed win-unpacked.tmp -> win-unpacked successfully')
    } catch (e2) {
      console.log('Rename also failed, will try another approach')
    }
  }
}

console.log('=== Running electron-builder ===')
try {
  execSync('npx electron-builder --win --x64', {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env,
  })
} catch (e) {
  console.log('\n=== electron-builder finished with non-zero exit ===')
  console.log('Checking if we need post-processing...')
  
  if (existsSync(tmpDir) && !existsSync(targetDir)) {
    console.log('Found win-unpacked.tmp but not win-unpacked, attempting rename...')
    try {
      renameSync(tmpDir, targetDir)
      console.log('Rename successful! Continuing build...')
      
      console.log('Re-running electron-builder to generate portable exe...')
      try {
        execSync('npx electron-builder --win --x64 --prepackaged ' + targetDir, {
          cwd: rootDir,
          stdio: 'inherit',
          env: process.env,
        })
      } catch (e3) {
        console.log('Re-run failed, but unpacked app is available at:', targetDir)
      }
    } catch (e2) {
      console.log('Rename failed:', e2.message)
    }
  }
}

console.log('\n=== Build process complete ===')
if (existsSync(targetDir)) {
  console.log('Unpacked app at:', targetDir)
}
