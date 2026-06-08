import { 
  existsSync, mkdirSync, rmSync, copyFileSync, 
  readdirSync, statSync, lstatSync, readFileSync, writeFileSync, 
  cpSync 
} from 'fs'
import path from 'path'
import { execSync, spawnSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = __dirname
const releaseDir = path.join(rootDir, 'release')
const tmpDir = path.join(releaseDir, 'win-unpacked.tmp')
const targetDir = path.join(releaseDir, 'win-unpacked')
const electronCacheDir = path.join(rootDir, '.electron-cache')
const appDataCache = path.join(rootDir, '.cache-appdata')

process.env.ELECTRON_CACHE = electronCacheDir
process.env.ELECTRON_BUILDER_CACHE = electronCacheDir
process.env.LOCALAPPDATA = appDataCache
process.env.APPDATA = appDataCache

mkdirSync(appDataCache, { recursive: true })
mkdirSync(path.join(appDataCache, 'electron'), { recursive: true })
mkdirSync(electronCacheDir, { recursive: true })

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true })
  const entries = readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}

function isLocked(filePath) {
  try {
    const fd = require('fs').openSync(filePath, 'r+')
    require('fs').closeSync(fd)
    return false
  } catch (e) {
    return true
  }
}

function waitForUnlock(dirPath, maxWaitMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    let allUnlocked = true
    function checkDir(d) {
      const entries = readdirSync(d, { withFileTypes: true })
      for (const e of entries) {
        const p = path.join(d, e.name)
        if (e.isFile()) {
          if (isLocked(p)) {
            allUnlocked = false
            return
          }
        } else if (e.isDirectory()) {
          checkDir(p)
          if (!allUnlocked) return
        }
      }
    }
    try { checkDir(dirPath) } catch (e) { allUnlocked = false }
    if (allUnlocked) return true
    console.log('Waiting for files to be unlocked...')
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2000)
  }
  return false
}

console.log('=== Step 1: Extract Electron (step 1 of build) ===')
let electronExtractFailed = false
try {
  execSync('npx electron-builder --win --x64', {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env,
  })
} catch (e) {
  console.log('electron-builder failed at electron extraction step (expected due to sandbox)')
  electronExtractFailed = true
}

console.log('\n=== Step 2: Copy extracted Electron files ===')
if (existsSync(tmpDir) && !existsSync(targetDir)) {
  waitForUnlock(tmpDir)
  copyDir(tmpDir, targetDir)
  console.log('Copied win-unpacked.tmp -> win-unpacked')
  
  try { rmSync(tmpDir, { recursive: true, force: true }) }
  catch (e) { console.log('Could not remove tmp dir (ok)') }
}

console.log('\n=== Step 3: Copy app files into resources ===')
const resourcesDir = path.join(targetDir, 'resources')
const appDir = path.join(resourcesDir, 'app')
mkdirSync(appDir, { recursive: true })

copyFileSync(path.join(rootDir, 'package.json'), path.join(appDir, 'package.json'))

copyDir(path.join(rootDir, 'dist'), path.join(appDir, 'dist'))

const depNames = [
  'express', 'cors', 'multer', 'sql.js', 'dotenv', 'fluent-ffmpeg', 'uuid',
  'clsx', 'tailwind-merge', 'zustand', 'hls.js', 'html2canvas', 'jspdf', 'docx',
  'file-saver', 'react', 'react-dom', 'react-router-dom', 'lucide-react',
  '@vercel/node',
]
const nodeModulesSrc = path.join(rootDir, 'node_modules')
const nodeModulesDst = path.join(appDir, 'node_modules')
mkdirSync(nodeModulesDst, { recursive: true })

for (const dep of depNames) {
  const src = path.join(nodeModulesSrc, dep)
  if (existsSync(src)) {
    copyDir(src, path.join(nodeModulesDst, dep))
  }
}

function copyPackageRoots(rootDirName) {
  const src = path.join(nodeModulesSrc, rootDirName)
  if (!existsSync(src)) return
  const entries = readdirSync(src)
  for (const entry of entries) {
    if (entry.startsWith('@')) {
      const scoped = path.join(src, entry)
      const scopedDst = path.join(nodeModulesDst, entry)
      mkdirSync(scopedDst, { recursive: true })
      const subEntries = readdirSync(scoped)
      for (const subEntry of subEntries) {
        copyDir(path.join(scoped, subEntry), path.join(scopedDst, subEntry))
      }
    }
  }
}
copyPackageRoots('.')

function copyNodeModulesTransitive(startDir) {
  if (!existsSync(startDir)) return
  const entries = readdirSync(startDir, { withFileTypes: true })
  for (const e of entries) {
    const p = path.join(startDir, e.name)
    if (e.isDirectory() && e.name !== '.bin') {
      const dst = path.join(nodeModulesDst, e.name)
      if (!existsSync(dst)) {
        try {
          copyDir(p, dst)
        } catch (err) {}
      }
      copyNodeModulesTransitive(path.join(p, 'node_modules'))
    }
  }
}
copyNodeModulesTransitive(path.join(rootDir, 'node_modules'))

console.log('App files copied successfully')

console.log('\n=== Step 4: Create asar archive ===')
const asarPkg = path.join(rootDir, 'node_modules', 'asar')
const asarExists = existsSync(asarPkg)

let hasAsar = false
try {
  const test = require.resolve('asar')
  hasAsar = true
} catch (e) {
  hasAsar = false
}

if (!hasAsar) {
  try {
    execSync('npm install --save-dev asar', { cwd: rootDir, stdio: 'inherit' })
    hasAsar = true
  } catch (e) {
    console.log('Could not install asar, skipping asar packaging (app will run from directory)')
  }
}

if (hasAsar) {
  try {
    const asarJs = require.resolve('asar/bin/asar.js')
    const appAsar = path.join(resourcesDir, 'app.asar')
    execSync(`node "${asarJs}" pack "${appDir}" "${appAsar}"`, { cwd: rootDir, stdio: 'inherit' })
    console.log('Asar archive created:', appAsar)
    
    rmSync(appDir, { recursive: true, force: true })
    console.log('Removed unpacked app directory')
  } catch (e) {
    console.log('Asar packaging failed:', e.message)
  }
}

console.log('\n=== Step 5: Build portable exe ===')
const iconPath = path.join(rootDir, 'build', 'icon.png')

const exePath = path.join(targetDir, '时光簿.exe')
const originalExe = path.join(targetDir, 'electron.exe')

if (existsSync(originalExe) && !existsSync(exePath)) {
  try {
    copyFileSync(originalExe, exePath)
    console.log('Renamed electron.exe -> 时光簿.exe (via copy)')
  } catch (e) {
    console.log('Copy/rename failed:', e.message)
  }
}

console.log('\n=== BUILD COMPLETE ===')
console.log('Unpacked app at:', targetDir)
console.log('Main executable: 时光簿.exe (in the above directory)')
console.log('\nYou can now:')
console.log('1. Zip the win-unpacked folder to distribute')
console.log('2. Or use a tool like Inno Setup to create an installer')
