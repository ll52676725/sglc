import { existsSync, mkdirSync } from 'fs'
import path from 'path'
import app from '../api/app.js'

const PORT = process.env.PORT || 6666
const APP_ROOT = process.env.APP_ROOT || ''
const DATA_DIR = process.env.DATA_DIR || ''
const UPLOADS_DIR = process.env.UPLOADS_DIR || ''

if (DATA_DIR && !existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true })
}
if (UPLOADS_DIR && !existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true })
}

const expectedClientDist = APP_ROOT
  ? path.resolve(APP_ROOT, 'dist', 'client')
  : 'no APP_ROOT'

console.log('[Server Start]')
console.log('  PORT:', PORT)
console.log('  ELECTRON_MODE:', process.env.ELECTRON_MODE)
console.log('  APP_ROOT:', APP_ROOT)
console.log('  expectedClientDist:', expectedClientDist)
console.log('  clientDist exists:', expectedClientDist !== 'no APP_ROOT' ? existsSync(expectedClientDist) : 'N/A')
console.log('  DATA_DIR:', DATA_DIR)
console.log('  UPLOADS_DIR:', UPLOADS_DIR)
console.log('  process.cwd():', process.cwd())

app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`)
})
