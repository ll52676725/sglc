import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import mediaRoutes from './routes/media.js'
import albumRoutes from './routes/albums.js'
import biographyRoutes from './routes/biography.js'
import statsRoutes from './routes/stats.js'
import aiRoutes from './routes/ai.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

app.use((_req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  next()
})

app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')))

app.use('/api/media', mediaRoutes)
app.use('/api/albums', albumRoutes)
app.use('/api/biography', biographyRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/ai', aiRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
