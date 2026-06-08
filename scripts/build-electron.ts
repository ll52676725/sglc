import { build } from 'esbuild'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const externalPackages = [
  'electron',
  'express',
  'cors',
  'multer',
  'sql.js',
  'dotenv',
  'fluent-ffmpeg',
  'uuid',
  'sharp',
  'hls.js',
  'html2canvas',
  'jspdf',
  'docx',
  'file-saver',
  'clsx',
  'tailwind-merge',
  'zustand',
  'react',
  'react-dom',
  'react-router-dom',
  'lucide-react',
  '@vercel/node',
]

await build({
  entryPoints: [
    path.join(rootDir, 'electron', 'main.ts'),
  ],
  outdir: path.join(rootDir, 'dist', 'electron'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  external: externalPackages,
  splitting: false,
})

console.log('Electron main process build complete!')

await build({
  entryPoints: [
    path.join(rootDir, 'electron', 'server-entry.ts'),
  ],
  outdir: path.join(rootDir, 'dist', 'electron'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  external: externalPackages,
  splitting: false,
})

console.log('Server entry build complete!')
