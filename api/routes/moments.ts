import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 } from 'uuid'
import { getDb, all, get, run } from '../db.js'

const router = Router()

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.resolve(process.cwd(), 'uploads')
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${v4()}${ext}`)
  },
})

const upload = multer({ storage })

router.post('/', upload.array('files', 9), async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    const { content, mood, weather, location, happenedAt, tags, existingMediaIds } = req.body

    if (!happenedAt) {
      res.status(400).json({ success: false, error: 'happenedAt is required' })
      return
    }

    const id = v4()
    run(db, `INSERT INTO moments (id, content, mood, weather, location, happened_at) VALUES (?, ?, ?, ?, ?, ?)`, [
      id, content || '', mood || '', weather || '', location || '', happenedAt,
    ])

    const files = req.files as Express.Multer.File[] | undefined
    const thumbnailMap = new Map<string, string>()
    if (files) {
      const thumbnailFiles = files.filter(f => f.originalname.startsWith('thumb_'))
      for (const tf of thumbnailFiles) {
        const originalFilename = tf.originalname.replace(/^thumb_/, '').replace(/\.jpg$/, '')
        thumbnailMap.set(originalFilename, `/uploads/${tf.filename}`)
      }
    }

    const mediaFiles = files ? files.filter(f => !f.originalname.startsWith('thumb_')) : []
    const newMediaIds: string[] = []
    let sortOrder = 0

    if (existingMediaIds) {
      const parsed = typeof existingMediaIds === 'string' ? JSON.parse(existingMediaIds) : existingMediaIds
      for (const mediaId of parsed) {
        run(db, `INSERT OR IGNORE INTO moment_media (moment_id, media_id, sort_order) VALUES (?, ?, ?)`, [id, mediaId, sortOrder++])
      }
    }

    for (const file of mediaFiles) {
      const mediaId = v4()
      const isVideo = file.mimetype.startsWith('video/')
      const isAudio = file.mimetype.startsWith('audio/')
      let type = 'photo'
      if (isVideo) type = 'video'
      else if (isAudio) type = 'audio'
      
      const url = `/uploads/${file.filename}`
      let thumbnailUrl = (isVideo || isAudio) ? '' : url

      if (isVideo && thumbnailMap.has(file.originalname)) {
        thumbnailUrl = thumbnailMap.get(file.originalname)!
      }

      run(db, `INSERT INTO media (id, type, filename, url, thumbnail_url) VALUES (?, ?, ?, ?, ?)`, [
        mediaId, type, file.originalname, url, thumbnailUrl,
      ])
      run(db, `INSERT OR IGNORE INTO moment_media (moment_id, media_id, sort_order) VALUES (?, ?, ?)`, [id, mediaId, sortOrder++])
      newMediaIds.push(mediaId)
    }

    if (tags) {
      const parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags
      for (const tag of parsedTags) {
        run(db, `INSERT INTO moment_tags (id, moment_id, tag) VALUES (?, ?, ?)`, [v4(), id, tag])
      }
    }

    const momentRow = get<{
      id: string; content: string; mood: string; weather: string; location: string;
      happened_at: string; created_at: string; updated_at: string;
    }>(db, `SELECT * FROM moments WHERE id = ?`, [id])

    const momentTags = all<{ tag: string }>(db, `SELECT tag FROM moment_tags WHERE moment_id = ?`, [id])
    const momentMedia = all<{
      m_id: string; m_type: string; m_filename: string; m_url: string; m_thumbnail_url: string;
    }>(db, `
      SELECT media.id as m_id, media.type as m_type, media.filename as m_filename,
             media.url as m_url, media.thumbnail_url as m_thumbnail_url
      FROM moment_media mm JOIN media ON mm.media_id = media.id
      WHERE mm.moment_id = ? ORDER BY mm.sort_order
    `, [id])

    res.json({
      success: true,
      data: {
        id: momentRow!.id,
        content: momentRow!.content,
        mood: momentRow!.mood,
        weather: momentRow!.weather,
        location: momentRow!.location,
        happenedAt: momentRow!.happened_at,
        createdAt: momentRow!.created_at,
        updatedAt: momentRow!.updated_at,
        tags: momentTags.map(t => t.tag),
        media: momentMedia.map(m => ({
          id: m.m_id,
          type: m.m_type,
          filename: m.m_filename,
          url: m.m_url,
          thumbnailUrl: m.m_thumbnail_url,
        })),
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    const { year, month, tag, page = '1', limit = '20' } = req.query

    const pageNum = Math.max(1, Number(page))
    const limitNum = Math.max(1, Math.min(100, Number(limit)))
    const offset = (pageNum - 1) * limitNum

    let whereClause = 'WHERE 1=1'
    const params: unknown[] = []

    if (year) {
      whereClause += ` AND strftime('%Y', m.happened_at) = ?`
      params.push(String(year))
    }

    if (month) {
      whereClause += ` AND strftime('%m', m.happened_at) = ?`
      params.push(String(month).padStart(2, '0'))
    }

    if (tag) {
      whereClause += ` AND m.id IN (SELECT mt.moment_id FROM moment_tags mt WHERE mt.tag = ?)`
      params.push(String(tag))
    }

    const countRow = get<{ cnt: number }>(db, `SELECT COUNT(*) as cnt FROM moments m ${whereClause}`, params)
    const total = countRow?.cnt ?? 0

    const momentRows = all<{
      id: string; content: string; mood: string; weather: string; location: string;
      happened_at: string; created_at: string; updated_at: string;
    }>(db, `SELECT m.* FROM moments m ${whereClause} ORDER BY m.happened_at DESC, m.created_at DESC LIMIT ? OFFSET ?`, [
      ...params, limitNum, offset,
    ])

    const moments = momentRows.map(row => {
      const momentTags = all<{ tag: string }>(db, `SELECT tag FROM moment_tags WHERE moment_id = ?`, [row.id])
      const momentMedia = all<{
        m_id: string; m_type: string; m_filename: string; m_url: string; m_thumbnail_url: string;
        m_date_taken: string | null; m_description: string; m_location: string;
        m_processing_status: string; m_processing_id: string;
      }>(db, `
        SELECT media.id as m_id, media.type as m_type, media.filename as m_filename,
               media.url as m_url, media.thumbnail_url as m_thumbnail_url,
               media.date_taken as m_date_taken, media.description as m_description, media.location as m_location,
               media.processing_status as m_processing_status, media.processing_id as m_processing_id
        FROM moment_media mm JOIN media ON mm.media_id = media.id
        WHERE mm.moment_id = ? ORDER BY mm.sort_order
      `, [row.id])

      return {
        id: row.id,
        content: row.content,
        mood: row.mood,
        weather: row.weather,
        location: row.location,
        happenedAt: row.happened_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        tags: momentTags.map(t => t.tag),
        media: momentMedia.map(m => ({
          id: m.m_id,
          type: m.m_type,
          filename: m.m_filename,
          url: m.m_url,
          thumbnailUrl: m.m_thumbnail_url,
          dateTaken: m.m_date_taken,
          description: m.m_description,
          location: m.m_location,
          processingStatus: m.m_processing_status,
          processingId: m.m_processing_id,
        })),
      }
    })

    res.json({
      success: true,
      data: {
        items: moments,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    const { id } = req.params

    const row = get<{
      id: string; content: string; mood: string; weather: string; location: string;
      happened_at: string; created_at: string; updated_at: string;
    }>(db, `SELECT * FROM moments WHERE id = ?`, [id])

    if (!row) {
      res.status(404).json({ success: false, error: 'Moment not found' })
      return
    }

    const momentTags = all<{ tag: string }>(db, `SELECT tag FROM moment_tags WHERE moment_id = ?`, [id])
    const momentMedia = all<{
      m_id: string; m_type: string; m_filename: string; m_url: string; m_thumbnail_url: string;
      m_date_taken: string | null; m_description: string; m_location: string;
      m_processing_status: string; m_processing_id: string;
    }>(db, `
      SELECT media.id as m_id, media.type as m_type, media.filename as m_filename,
             media.url as m_url, media.thumbnail_url as m_thumbnail_url,
             media.date_taken as m_date_taken, media.description as m_description, media.location as m_location,
             media.processing_status as m_processing_status, media.processing_id as m_processing_id
      FROM moment_media mm JOIN media ON mm.media_id = media.id
      WHERE mm.moment_id = ? ORDER BY mm.sort_order
    `, [id])

    res.json({
      success: true,
      data: {
        id: row.id,
        content: row.content,
        mood: row.mood,
        weather: row.weather,
        location: row.location,
        happenedAt: row.happened_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        tags: momentTags.map(t => t.tag),
        media: momentMedia.map(m => ({
          id: m.m_id,
          type: m.m_type,
          filename: m.m_filename,
          url: m.m_url,
          thumbnailUrl: m.m_thumbnail_url,
          dateTaken: m.m_date_taken,
          description: m.m_description,
          location: m.m_location,
          processingStatus: m.m_processing_status,
          processingId: m.m_processing_id,
        })),
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    const { id } = req.params
    const { content, mood, weather, location, happenedAt, tags, mediaIds } = req.body

    const existing = get(db, `SELECT id FROM moments WHERE id = ?`, [id])
    if (!existing) {
      res.status(404).json({ success: false, error: 'Moment not found' })
      return
    }

    run(db, `UPDATE moments SET content = ?, mood = ?, weather = ?, location = ?, happened_at = ?, updated_at = datetime('now') WHERE id = ?`, [
      content ?? '', mood ?? '', weather ?? '', location ?? '', happenedAt ?? new Date().toISOString(), id,
    ])

    if (Array.isArray(mediaIds)) {
      run(db, `DELETE FROM moment_media WHERE moment_id = ?`, [id])
      mediaIds.forEach((mediaId: string, index: number) => {
        run(db, `INSERT OR IGNORE INTO moment_media (moment_id, media_id, sort_order) VALUES (?, ?, ?)`, [id, mediaId, index])
      })
    }

    if (Array.isArray(tags)) {
      run(db, `DELETE FROM moment_tags WHERE moment_id = ?`, [id])
      for (const tag of tags) {
        run(db, `INSERT INTO moment_tags (id, moment_id, tag) VALUES (?, ?, ?)`, [v4(), id, tag])
      }
    }

    res.json({ success: true, data: { id } })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    const { id } = req.params

    const existing = get(db, `SELECT id FROM moments WHERE id = ?`, [id])
    if (!existing) {
      res.status(404).json({ success: false, error: 'Moment not found' })
      return
    }

    run(db, `DELETE FROM moment_media WHERE moment_id = ?`, [id])
    run(db, `DELETE FROM moment_tags WHERE moment_id = ?`, [id])
    run(db, `DELETE FROM moments WHERE id = ?`, [id])

    res.json({ success: true, data: { id } })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

export default router
