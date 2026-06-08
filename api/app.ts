import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import fs from 'fs'
import { fileURLToPath } from 'url'
import mediaRoutes from './routes/media.js'
import albumRoutes from './routes/albums.js'
import biographyRoutes from './routes/biography.js'
import statsRoutes from './routes/stats.js'
import aiRoutes from './routes/ai.js'
import momentsRoutes from './routes/moments.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

const uploadsDir = process.env.UPLOADS_DIR || path.resolve(process.cwd(), 'uploads')
app.use('/uploads', express.static(uploadsDir))

app.use('/api/media', mediaRoutes)
app.use('/api/albums', albumRoutes)
app.use('/api/biography', biographyRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/moments', momentsRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.get(
  '/api/debug/paths',
  (req: Request, res: Response): void => {
    try {
      let clientDist = ''
      const isProduction = process.env.NODE_ENV === 'production' || process.env.ELECTRON_MODE === 'true'
      if (process.env.APP_ROOT) {
        clientDist = path.resolve(process.env.APP_ROOT, 'dist', 'client')
      } else if (process.env.ELECTRON_MODE === 'true') {
        clientDist = path.resolve(process.cwd(), 'dist', 'client')
      } else {
        clientDist = path.resolve(__dirname, '..', 'dist', 'client')
      }
      res.status(200).json({
        APP_ROOT: process.env.APP_ROOT,
        ELECTRON_MODE: process.env.ELECTRON_MODE,
        NODE_ENV: process.env.NODE_ENV,
        isProduction,
        clientDist,
        clientDistExists: fs.existsSync(clientDist),
        indexHtmlExists: fs.existsSync(path.join(clientDist, 'index.html')),
        cwd: process.cwd(),
        __dirname,
      })
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message, stack: err.stack })
    }
  },
)

app.use((req: Request, res: Response, next: NextFunction) => {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.ELECTRON_MODE === 'true'
  if (!isProduction) return next()

  let clientDist
  if (process.env.APP_ROOT) {
    clientDist = path.resolve(process.env.APP_ROOT, 'dist', 'client')
  } else {
    clientDist = path.resolve(__dirname, '..', 'dist', 'client')
  }

  express.static(clientDist)(req, res, () => {
    if (req.method === 'GET' && !req.path.startsWith('/api/')) {
      res.sendFile(path.join(clientDist, 'index.html'))
    } else {
      next()
    }
  })
})

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: error.message || 'Server internal error',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
