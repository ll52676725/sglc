import { Router, type Request, type Response } from 'express'
import { getDb, all, get } from '../db.js'

const router = Router()

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()

    const photoCount = get<{ cnt: number }>(db, `SELECT COUNT(*) as cnt FROM media WHERE type = 'photo'`, [])
    const videoCount = get<{ cnt: number }>(db, `SELECT COUNT(*) as cnt FROM media WHERE type = 'video'`, [])
    const albumCount = get<{ cnt: number }>(db, `SELECT COUNT(*) as cnt FROM albums`, [])

    const dateRange = get<{ earliest: string | null; latest: string | null }>(
      db,
      `SELECT MIN(date_taken) as earliest, MAX(date_taken) as latest FROM media WHERE date_taken IS NOT NULL`,
      [],
    )

    let yearSpan = 0
    if (dateRange?.earliest && dateRange?.latest) {
      const earliestYear = new Date(dateRange.earliest).getFullYear()
      const latestYear = new Date(dateRange.latest).getFullYear()
      yearSpan = latestYear - earliestYear + 1
    }

    const tagCloud = all<{ tag: string; count: number }>(
      db,
      `SELECT tag, COUNT(*) as count FROM media_tags GROUP BY tag ORDER BY count DESC`,
      [],
    )

    res.json({
      success: true,
      data: {
        totalPhotos: photoCount?.cnt ?? 0,
        totalVideos: videoCount?.cnt ?? 0,
        totalAlbums: albumCount?.cnt ?? 0,
        yearSpan,
        earliestDate: dateRange?.earliest ?? null,
        latestDate: dateRange?.latest ?? null,
        tagCloud,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

export default router
