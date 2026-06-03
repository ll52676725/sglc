import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 } from 'uuid'
import { getDb, all, get, run } from '../db.js'

const router = Router()

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads')
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

router.post('/upload', upload.array('files', 50), async (req: Request, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[]
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, error: 'No files uploaded' })
      return
    }

    const albumId = req.body.albumId as string | undefined
    const db = await getDb()
    const mediaList = []

    const thumbnailMap = new Map<string, string>()
    const thumbnailFiles = files.filter(f => f.originalname.startsWith('thumb_'))
    for (const tf of thumbnailFiles) {
      const originalFilename = tf.originalname.replace(/^thumb_/, '').replace(/\.jpg$/, '')
      thumbnailMap.set(originalFilename, `/uploads/${tf.filename}`)
    }

    const mediaFiles = files.filter(f => !f.originalname.startsWith('thumb_'))

    for (const file of mediaFiles) {
      const id = v4()
      const isVideo = file.mimetype.startsWith('video/')
      const type = isVideo ? 'video' : 'photo'
      const url = `/uploads/${file.filename}`
      let thumbnailUrl = isVideo ? '' : url

      if (isVideo && thumbnailMap.has(file.originalname)) {
        thumbnailUrl = thumbnailMap.get(file.originalname)!
      }

      run(db, `INSERT INTO media (id, type, filename, url, thumbnail_url) VALUES (?, ?, ?, ?, ?)`, [
        id, type, file.originalname, url, thumbnailUrl,
      ])

      if (albumId) {
        const existing = get(db, `SELECT id FROM albums WHERE id = ?`, [albumId])
        if (existing) {
          run(db, `INSERT OR IGNORE INTO media_albums (media_id, album_id) VALUES (?, ?)`, [id, albumId])
        }
      }

      mediaList.push({
        id,
        type,
        filename: file.originalname,
        url,
        thumbnailUrl,
        dateTaken: null,
        location: '',
        description: '',
        albumIds: albumId ? [albumId] : [],
      })
    }

    res.json({ success: true, data: mediaList })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    const { year, month, albumId, tag, page = '1', limit = '20' } = req.query

    const pageNum = Math.max(1, Number(page))
    const limitNum = Math.max(1, Math.min(100, Number(limit)))
    const offset = (pageNum - 1) * limitNum

    let whereClause = 'WHERE 1=1'
    const params: unknown[] = []

    if (year) {
      whereClause += ` AND strftime('%Y', m.date_taken) = ?`
      params.push(String(year))
    }

    if (month) {
      whereClause += ` AND strftime('%m', m.date_taken) = ?`
      params.push(String(month).padStart(2, '0'))
    }

    if (albumId) {
      whereClause += ` AND m.id IN (SELECT ma.media_id FROM media_albums ma WHERE ma.album_id = ?)`
      params.push(String(albumId))
    }

    if (tag) {
      whereClause += ` AND m.id IN (SELECT mt.media_id FROM media_tags mt WHERE mt.tag = ?)`
      params.push(String(tag))
    }

    const countRow = get<{ cnt: number }>(db, `SELECT COUNT(*) as cnt FROM media m ${whereClause}`, params)
    const total = countRow?.cnt ?? 0

    const mediaRows = all<{
      id: string
      type: string
      filename: string
      url: string
      thumbnail_url: string
      date_taken: string | null
      location: string
      description: string
      created_at: string
      updated_at: string
    }>(db, `SELECT m.* FROM media m ${whereClause} ORDER BY m.date_taken DESC NULLS LAST, m.created_at DESC LIMIT ? OFFSET ?`, [
      ...params, limitNum, offset,
    ])

    const mediaList = mediaRows.map(row => ({
      id: row.id,
      type: row.type,
      filename: row.filename,
      url: row.url,
      thumbnailUrl: row.thumbnail_url,
      dateTaken: row.date_taken,
      location: row.location,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

    for (const item of mediaList) {
      const people = all<{ name: string }>(db, `SELECT name FROM media_people WHERE media_id = ?`, [item.id])
      const tags = all<{ tag: string }>(db, `SELECT tag FROM media_tags WHERE media_id = ?`, [item.id])
      const albums = all<{ album_id: string }>(db, `SELECT album_id FROM media_albums WHERE media_id = ?`, [item.id])
      ;(item as Record<string, unknown>).people = people.map(p => p.name)
      ;(item as Record<string, unknown>).tags = tags.map(t => t.tag)
      ;(item as Record<string, unknown>).albumIds = albums.map(a => a.album_id)
    }

    res.json({
      success: true,
      data: {
        items: mediaList,
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
      id: string
      type: string
      filename: string
      url: string
      thumbnail_url: string
      date_taken: string | null
      location: string
      description: string
      created_at: string
      updated_at: string
    }>(db, `SELECT * FROM media WHERE id = ?`, [id])

    if (!row) {
      res.status(404).json({ success: false, error: 'Media not found' })
      return
    }

    const people = all<{ id: string; name: string }>(db, `SELECT id, name FROM media_people WHERE media_id = ?`, [id])
    const tags = all<{ id: string; tag: string }>(db, `SELECT id, tag FROM media_tags WHERE media_id = ?`, [id])
    const albums = all<{ album_id: string }>(db, `SELECT album_id FROM media_albums WHERE media_id = ?`, [id])

    res.json({
      success: true,
      data: {
        id: row.id,
        type: row.type,
        filename: row.filename,
        url: row.url,
        thumbnailUrl: row.thumbnail_url,
        dateTaken: row.date_taken,
        location: row.location,
        description: row.description,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        people,
        tags,
        albumIds: albums.map(a => a.album_id),
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
    const { description, dateTaken, location, people, tags, albumIds } = req.body

    const existing = get(db, `SELECT id FROM media WHERE id = ?`, [id])
    if (!existing) {
      res.status(404).json({ success: false, error: 'Media not found' })
      return
    }

    run(db, `UPDATE media SET description = ?, date_taken = ?, location = ?, updated_at = datetime('now') WHERE id = ?`, [
      description ?? '', dateTaken ?? null, location ?? '', id,
    ])

    if (Array.isArray(people)) {
      run(db, `DELETE FROM media_people WHERE media_id = ?`, [id])
      for (const name of people) {
        run(db, `INSERT INTO media_people (id, media_id, name) VALUES (?, ?, ?)`, [v4(), id, name])
      }
    }

    if (Array.isArray(tags)) {
      run(db, `DELETE FROM media_tags WHERE media_id = ?`, [id])
      for (const tag of tags) {
        run(db, `INSERT INTO media_tags (id, media_id, tag) VALUES (?, ?, ?)`, [v4(), id, tag])
      }
    }

    if (Array.isArray(albumIds)) {
      run(db, `DELETE FROM media_albums WHERE media_id = ?`, [id])
      for (const albumId of albumIds) {
        run(db, `INSERT INTO media_albums (media_id, album_id) VALUES (?, ?)`, [id, albumId])
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

    const row = get<{ url: string }>(db, `SELECT url FROM media WHERE id = ?`, [id])
    if (!row) {
      res.status(404).json({ success: false, error: 'Media not found' })
      return
    }

    if (row.url && row.url.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), row.url)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    }

    run(db, `DELETE FROM media_people WHERE media_id = ?`, [id])
    run(db, `DELETE FROM media_tags WHERE media_id = ?`, [id])
    run(db, `DELETE FROM media_albums WHERE media_id = ?`, [id])
    run(db, `DELETE FROM media WHERE id = ?`, [id])

    res.json({ success: true, data: { id } })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

export default router
