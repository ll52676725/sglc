import { 
  existsSync, mkdirSync, rmSync, copyFileSync, 
  readdirSync, statSync, readFileSync 
} from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = __dirname
const releaseDir = path.join(rootDir, 'release')
const targetDir = path.join(releaseDir, 'win-unpacked')

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
    } catch (e) {
      console.log(`  Skip: ${entry.name} - ${e.message}`)
    }
  }
}

console.log('=== Re-copying app files into resources ===')
const resourcesDir = path.join(targetDir, 'resources')
const appDir = path.join(resourcesDir, 'app')
if (existsSync(appDir)) {
  rmSync(appDir, { recursive: true, force: true })
}
mkdirSync(appDir, { recursive: true })

console.log('Copying package.json...')
copyFileSync(path.join(rootDir, 'package.json'), path.join(appDir, 'package.json'))

console.log('Copying dist/ (built frontend + electron)...')
copyDir(path.join(rootDir, 'dist'), path.join(appDir, 'dist'))

console.log('Copying node_modules dependencies...')
const nodeModulesSrc = path.join(rootDir, 'node_modules')
const nodeModulesDst = path.join(appDir, 'node_modules')
mkdirSync(nodeModulesDst, { recursive: true })

function needToCopy(name) {
  const noCopy = [
    '.bin', '.cache', '.pnpm', '.vite', 'esbuild', 'electron', 'electron-builder',
    '@electron', 'typescript', 'eslint', '@eslint', 'vite', '@vitejs', 'tsx',
    'concurrently', 'nodemon', 'autoprefixer', 'postcss', 'tailwindcss',
    'sharp', 'asar', 'prettier', 'stylelint', 'babel-plugin-react-dev-locator',
    'vite-plugin-trae-solo-badge', 'glob', 'rimraf', 'inflight', 'wrappy',
    'balanced-match', 'brace-expansion', 'minimatch', 'cross-spawn',
    'shebang-command', 'shebang-regex', 'path-key', 'which',
    'isexe', 'npm-run-path', 'p-finally', 'signal-exit', 'strip-eof',
    'onetime', 'mimic-fn', 'yallist', 'lru-cache',
    '@nodelib', 'fastq', 'reusify', 'queue-microtask',
  ]
  if (noCopy.includes(name)) return false
  if (name.startsWith('.') && name !== '.bin') return false
  return true
}

function copyModule(name, srcBase, dstBase) {
  const src = path.join(srcBase, name)
  const dst = path.join(dstBase, name)
  if (existsSync(dst)) return
  if (!existsSync(src)) return
  try {
    copyDir(src, dst)
  } catch (e) {
    console.log(`  Fail copy ${name}: ${e.message}`)
  }
}

function readDirectDeps() {
  const pkg = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf-8'))
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }
  return Object.keys(deps)
}

function readPkgDeps(dir) {
  try {
    const pkgPath = path.join(dir, 'package.json')
    if (!existsSync(pkgPath)) return []
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    return Object.keys(pkg.dependencies || {})
  } catch (e) {
    return []
  }
}

const visited = new Set()
const queue = [...readDirectDeps()]

while (queue.length > 0) {
  const name = queue.shift()
  if (visited.has(name)) continue
  if (!needToCopy(name)) {
    visited.add(name)
    continue
  }
  visited.add(name)
  
  const src = path.join(nodeModulesSrc, name)
  if (!existsSync(src)) continue
  
  console.log(`  Copy: ${name}`)
  copyModule(name, nodeModulesSrc, nodeModulesDst)
  
  const deps = readPkgDeps(src)
  for (const dep of deps) {
    if (!visited.has(dep)) {
      queue.push(dep)
    }
  }
  
  const nestedNm = path.join(src, 'node_modules')
  if (existsSync(nestedNm)) {
    for (const entry of readdirSync(nestedNm)) {
      if (!visited.has(entry)) {
        queue.push(entry)
      }
    }
  }
}

console.log(`\nCopied ${visited.size} dependencies`)

console.log('\n=== Creating asar archive ===')
const appAsar = path.join(resourcesDir, 'app.asar')
try {
  const asarBin = path.join(rootDir, 'node_modules', '.bin', 'asar.cmd')
  const result = spawnSync(
    asarBin,
    ['pack', appDir, appAsar],
    { cwd: rootDir, stdio: 'inherit' }
  )
  if (result.status === 0 && existsSync(appAsar)) {
    console.log('Asar archive created!')
    rmSync(appDir, { recursive: true, force: true })
    console.log('Removed unpacked app dir')
  } else {
    console.log('Asar pack failed, keeping unpacked app')
  }
} catch (e) {
  console.log('Asar packaging failed:', e.message)
}

console.log('\n=== Done! ===')
console.log('Unpacked app at:', targetDir)
console.log('Resources dir:', resourcesDir)
if (existsSync(appAsar)) {
  console.log('Asar archive at:', appAsar)
}
