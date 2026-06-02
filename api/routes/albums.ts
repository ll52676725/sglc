import { Router, type Request, type Response } from 'express'
import { v4 } from 'uuid'
import { getDb, all, get, run } from '../db.js'

const router = Router()

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()

    const albums = all<{
      id: string
      name: string
      category: string
      description: string
      cover_media_id: string | null
      created_at: string
      updated_at: string
    }>(db, `SELECT * FROM albums ORDER BY created_at DESC`, [])

    const result = albums.map(album => {
      const mediaCount = get<{ cnt: number }>(db, `SELECT COUNT(*) as cnt FROM media_albums WHERE album_id = ?`, [album.id])
      const dateRange = get<{ min_date: string | null; max_date: string | null }>(
        db,
        `SELECT MIN(m.date_taken) as min_date, MAX(m.date_taken) as max_date
         FROM media_albums ma JOIN media m ON ma.media_id = m.id
         WHERE ma.album_id = ? AND m.date_taken IS NOT NULL`,
        [album.id],
      )

      return {
        id: album.id,
        name: album.name,
        category: album.category,
        description: album.description,
        coverMediaId: album.cover_media_id,
        mediaCount: mediaCount?.cnt ?? 0,
        earliestDate: dateRange?.min_date ?? null,
        latestDate: dateRange?.max_date ?? null,
        createdAt: album.created_at,
        updatedAt: album.updated_at,
      }
    })

    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    const { name, category, description, coverMediaId } = req.body

    if (!name || !category) {
      res.status(400).json({ success: false, error: 'Name and category are required' })
      return
    }

    const id = v4()
    run(db, `INSERT INTO albums (id, name, category, description, cover_media_id) VALUES (?, ?, ?, ?, ?)`, [
      id, name, category, description ?? '', coverMediaId ?? null,
    ])

    res.status(201).json({
      success: true,
      data: { id, name, category, description: description ?? '', coverMediaId: coverMediaId ?? null },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    const { id } = req.params

    const album = get<{
      id: string
      name: string
      category: string
      description: string
      cover_media_id: string | null
      created_at: string
      updated_at: string
    }>(db, `SELECT * FROM albums WHERE id = ?`, [id])

    if (!album) {
      res.status(404).json({ success: false, error: 'Album not found' })
      return
    }

    const mediaRows = all<{
      id: string
      type: string
      filename: string
      url: string
      thumbnail_url: string
      date_taken: string | null
      location: string
      description: string
    }>(
      db,
      `SELECT m.* FROM media m INNER JOIN media_albums ma ON m.id = ma.media_id WHERE ma.album_id = ? ORDER BY m.date_taken DESC NULLS LAST`,
      [id],
    )

    const mediaList = mediaRows.map(m => ({
      id: m.id,
      type: m.type,
      filename: m.filename,
      url: m.url,
      thumbnailUrl: m.thumbnail_url,
      dateTaken: m.date_taken,
      location: m.location,
      description: m.description,
    }))

    res.json({
      success: true,
      data: {
        id: album.id,
        name: album.name,
        category: album.category,
        description: album.description,
        coverMediaId: album.cover_media_id,
        createdAt: album.created_at,
        updatedAt: album.updated_at,
        media: mediaList,
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
    const { name, category, description, coverMediaId } = req.body

    const existing = get(db, `SELECT id FROM albums WHERE id = ?`, [id])
    if (!existing) {
      res.status(404).json({ success: false, error: 'Album not found' })
      return
    }

    run(db, `UPDATE albums SET name = ?, category = ?, description = ?, cover_media_id = ?, updated_at = datetime('now') WHERE id = ?`, [
      name, category, description ?? '', coverMediaId ?? null, id,
    ])

    res.json({ success: true, data: { id } })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    const { id } = req.params

    const existing = get(db, `SELECT id FROM albums WHERE id = ?`, [id])
    if (!existing) {
      res.status(404).json({ success: false, error: 'Album not found' })
      return
    }

    run(db, `DELETE FROM media_albums WHERE album_id = ?`, [id])
    run(db, `DELETE FROM albums WHERE id = ?`, [id])

    res.json({ success: true, data: { id } })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.post('/:id/media', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    const { id } = req.params
    const { mediaIds } = req.body

    if (!Array.isArray(mediaIds)) {
      res.status(400).json({ success: false, error: 'mediaIds array is required' })
      return
    }

    const existing = get(db, `SELECT id FROM albums WHERE id = ?`, [id])
    if (!existing) {
      res.status(404).json({ success: false, error: 'Album not found' })
      return
    }

    for (const mediaId of mediaIds) {
      const link = get(db, `SELECT media_id FROM media_albums WHERE media_id = ? AND album_id = ?`, [mediaId, id])
      if (!link) {
        run(db, `INSERT INTO media_albums (media_id, album_id) VALUES (?, ?)`, [mediaId, id])
      }
    }

    res.json({ success: true, data: { albumId: id, addedCount: mediaIds.length } })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.delete('/:id/media/:mediaId', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    const { id, mediaId } = req.params

    run(db, `DELETE FROM media_albums WHERE media_id = ? AND album_id = ?`, [mediaId, id])

    res.json({ success: true, data: { albumId: id, mediaId } })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

export default router
