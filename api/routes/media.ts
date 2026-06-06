import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 } from 'uuid'
import { getDb, all, get, run } from '../db.js'
import { processVideo, processVideoAsync, getProcessingStatus, isFfmpegAvailable } from '../lib/video-processor.js'

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
    const syncToMoments = req.body.syncToMoments === 'true' || req.body.syncToMoments === true
    const momentContent = req.body.momentContent as string || ''
    const db = await getDb()
    const mediaList = []

    const thumbnailMap = new Map<string, string>()
    const thumbnailFiles = files.filter(f => f.originalname.startsWith('thumb_'))
    for (const tf of thumbnailFiles) {
      const originalFilename = tf.originalname.replace(/^thumb_/, '').replace(/\.jpg$/, '')
      thumbnailMap.set(originalFilename, `/uploads/${tf.filename}`)
    }

    const mediaFiles = files.filter(f => !f.originalname.startsWith('thumb_'))
    const ffmpegAvailable = isFfmpegAvailable()

    for (const file of mediaFiles) {
      const id = v4()
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

      let processingStatus = 'completed'
      let processingId = ''

      if (isVideo && ffmpegAvailable) {
        processingStatus = 'processing'
        processingId = await processVideoAsync(file.path, file.filename)

        setTimeout(async () => {
          const status = getProcessingStatus(processingId)
          let checkCount = 0
          const maxChecks = 600

          const checkInterval = setInterval(async () => {
            checkCount++
            const currentStatus = getProcessingStatus(processingId)
            
            if (currentStatus?.status === 'completed' || currentStatus?.status === 'failed' || checkCount >= maxChecks) {
              clearInterval(checkInterval)
              
              if (currentStatus?.result) {
                const result = currentStatus.result
                const dbUpdate = await getDb()
                run(dbUpdate, `
                  UPDATE media 
                  SET thumbnail_url = ?, 
                      hls_master_url = ?, 
                      video_qualities = ?,
                      duration = ?,
                      width = ?,
                      height = ?,
                      processing_status = 'completed',
                      updated_at = datetime('now')
                  WHERE id = ?
                `, [
                  result.thumbnailUrl || thumbnailUrl,
                  result.hlsMasterUrl || '',
                  JSON.stringify(result.qualities || []),
                  result.duration || 0,
                  result.width || 0,
                  result.height || 0,
                  id,
                ])
              }
            }
          }, 2000)
        }, 100)
      }

      run(db, `INSERT INTO media (id, type, filename, url, thumbnail_url, processing_status, processing_id) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
        id, type, file.originalname, url, thumbnailUrl, processingStatus, processingId,
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
        processingStatus,
        processingId,
      })
    }

    let createdMoment: any = null
    if (syncToMoments && mediaList.length > 0) {
      const momentId = v4()
      const now = new Date().toISOString()
      run(db, `INSERT INTO moments (id, content, happened_at) VALUES (?, ?, ?)`, [
        momentId, momentContent, now,
      ])

      let sortOrder = 0
      for (const m of mediaList) {
        run(db, `INSERT OR IGNORE INTO moment_media (moment_id, media_id, sort_order) VALUES (?, ?, ?)`, [
          momentId, m.id, sortOrder++,
        ])
      }

      const momentTags = all<{ tag: string }>(db, `SELECT tag FROM moment_tags WHERE moment_id = ?`, [momentId])
      const momentMedia = all<{
        m_id: string; m_type: string; m_filename: string; m_url: string; m_thumbnail_url: string;
      }>(db, `
        SELECT media.id as m_id, media.type as m_type, media.filename as m_filename,
               media.url as m_url, media.thumbnail_url as m_thumbnail_url
        FROM moment_media mm JOIN media ON mm.media_id = media.id
        WHERE mm.moment_id = ? ORDER BY mm.sort_order
      `, [momentId])

      createdMoment = {
        id: momentId,
        content: momentContent,
        mood: '',
        weather: '',
        location: '',
        happenedAt: now,
        createdAt: now,
        updatedAt: now,
        tags: momentTags.map(t => t.tag),
        media: momentMedia.map(m => ({
          id: m.m_id,
          type: m.m_type,
          filename: m.m_filename,
          url: m.m_url,
          thumbnailUrl: m.m_thumbnail_url,
        })),
      }
    }

    res.json({ success: true, data: { media: mediaList, moment: createdMoment } })
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
      duration: number
      width: number
      height: number
      hls_master_url: string
      video_qualities: string
      processing_status: string
      processing_id: string
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
      duration: row.duration,
      width: row.width,
      height: row.height,
      hlsMasterUrl: row.hls_master_url,
      videoQualities: row.video_qualities ? JSON.parse(row.video_qualities) : [],
      processingStatus: row.processing_status,
      processingId: row.processing_id,
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
      duration: number
      width: number
      height: number
      hls_master_url: string
      video_qualities: string
      processing_status: string
      processing_id: string
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
        duration: row.duration,
        width: row.width,
        height: row.height,
        hlsMasterUrl: row.hls_master_url,
        videoQualities: row.video_qualities ? JSON.parse(row.video_qualities) : [],
        processingStatus: row.processing_status,
        processingId: row.processing_id,
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

router.get('/processing/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const status = getProcessingStatus(id)
    
    if (!status) {
      res.status(404).json({ success: false, error: 'Processing task not found' })
      return
    }

    res.json({
      success: true,
      data: status,
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
