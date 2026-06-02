import { Router, type Request, type Response } from 'express'
import { v4 } from 'uuid'
import { getDb, all, get, run } from '../db.js'

const router = Router()

const CATEGORY_LABELS: Record<string, string> = {
  holiday: '节日',
  travel: '旅行',
  daily: '日常',
  milestone: '里程碑',
  other: '其他',
}

const STYLE_TEMPLATES: Record<string, (title: string, chapters: string[]) => string> = {
  formal: (title, chapters) =>
    `${title}\n\n${chapters.join('\n\n')}\n\n综上所述，这段时间记录了珍贵的回忆与成长。`,

  casual: (title, chapters) =>
    `${title}\n\n${chapters.join('\n\n')}\n\n这就是这段时间的故事，每一段都值得珍藏！`,

  poetic: (title, chapters) =>
    `${title}\n\n${chapters.join('\n\n')}\n\n岁月如歌，光影留痕，愿这些记忆永远温暖如初。`,
}

function generateBiographyContent(
  mediaRows: { date_taken: string | null; location: string; description: string; type: string }[],
  albumRows: { name: string; category: string }[],
  startYear: number,
  endYear: number,
  style: string,
  language: string,
): { title: string; content: string } {
  const isZh = language === 'zh'

  const title = isZh
    ? `时光回忆录：${startYear}-${endYear}`
    : `Memoir of Time: ${startYear}-${endYear}`

  const mediaByYear = new Map<number, typeof mediaRows>()
  for (const m of mediaRows) {
    if (!m.date_taken) continue
    const year = new Date(m.date_taken).getFullYear()
    if (!mediaByYear.has(year)) mediaByYear.set(year, [])
    mediaByYear.get(year)!.push(m)
  }

  const chapters: string[] = []

  if (isZh) {
    if (albumRows.length > 0) {
      const albumNames = albumRows.map(a => `「${a.name}」(${CATEGORY_LABELS[a.category] || a.category})`).join('、')
      chapters.push(`在这段时光中，我们创建了以下相册：${albumNames}。`)
    }

    const sortedYears = [...mediaByYear.keys()].sort()
    for (const year of sortedYears) {
      const items = mediaByYear.get(year)!
      const photos = items.filter(m => m.type === 'photo').length
      const videos = items.filter(m => m.type === 'video').length
      const locations = [...new Set(items.map(m => m.location).filter(Boolean))]
      const people = [...new Set(items.flatMap(m => m.description ? [m.description] : []))]

      let chapter = `## ${year}年\n\n${year}年，我们记录了${photos}张照片${videos > 0 ? `、${videos}段视频` : ''}。`
      if (locations.length > 0) {
        chapter += `足迹遍布${locations.join('、')}等地。`
      }

      const descriptions = items.map(m => m.description).filter(Boolean)
      if (descriptions.length > 0) {
        const uniqueDescs = [...new Set(descriptions)]
        chapter += `\n\n${uniqueDescs.slice(0, 5).map(d => `— ${d}`).join('\n')}`
      }

      chapters.push(chapter)
    }

    if (chapters.length === 0) {
      chapters.push(`${startYear}年至${endYear}年间，暂无媒体记录。`)
    }
  } else {
    if (albumRows.length > 0) {
      const albumNames = albumRows.map(a => `"${a.name}" (${a.category})`).join(', ')
      chapters.push(`During this period, we created the following albums: ${albumNames}.`)
    }

    const sortedYears = [...mediaByYear.keys()].sort()
    for (const year of sortedYears) {
      const items = mediaByYear.get(year)!
      const photos = items.filter(m => m.type === 'photo').length
      const videos = items.filter(m => m.type === 'video').length
      const locations = [...new Set(items.map(m => m.location).filter(Boolean))]

      let chapter = `## ${year}\n\nIn ${year}, we captured ${photos} photos${videos > 0 ? ` and ${videos} videos` : ''}.`
      if (locations.length > 0) {
        chapter += ` Places visited include ${locations.join(', ')}.`
      }

      chapters.push(chapter)
    }

    if (chapters.length === 0) {
      chapters.push(`No media records found between ${startYear} and ${endYear}.`)
    }
  }

  const templateFn = STYLE_TEMPLATES[style] || STYLE_TEMPLATES.casual
  const content = templateFn(title, chapters)

  return { title, content }
}

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()

    const biographies = all<{
      id: string
      title: string
      style: string
      language: string
      start_year: number | null
      end_year: number | null
      content: string
      created_at: string
      updated_at: string
    }>(db, `SELECT * FROM biographies ORDER BY created_at DESC`, [])

    res.json({ success: true, data: biographies })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.post('/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    const { startYear, endYear, style = 'casual', language = 'zh' } = req.body

    if (!startYear || !endYear) {
      res.status(400).json({ success: false, error: 'startYear and endYear are required' })
      return
    }

    const mediaRows = all<{
      date_taken: string | null
      location: string
      description: string
      type: string
    }>(
      db,
      `SELECT m.date_taken, m.location, m.description, m.type
       FROM media m
       WHERE m.date_taken IS NOT NULL
         AND strftime('%Y', m.date_taken) >= ?
         AND strftime('%Y', m.date_taken) <= ?
       ORDER BY m.date_taken ASC`,
      [String(startYear), String(endYear)],
    )

    const albumRows = all<{ name: string; category: string }>(
      db,
      `SELECT DISTINCT a.name, a.category
       FROM albums a
       INNER JOIN media_albums ma ON a.id = ma.album_id
       INNER JOIN media m ON ma.media_id = m.id
       WHERE m.date_taken IS NOT NULL
         AND strftime('%Y', m.date_taken) >= ?
         AND strftime('%Y', m.date_taken) <= ?`,
      [String(startYear), String(endYear)],
    )

    const { title, content } = generateBiographyContent(mediaRows, albumRows, startYear, endYear, style, language)

    const id = v4()
    run(db, `INSERT INTO biographies (id, title, style, language, start_year, end_year, content) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
      id, title, style, language, startYear, endYear, content,
    ])

    res.status(201).json({
      success: true,
      data: { id, title, style, language, startYear, endYear, content },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    const { id } = req.params

    const biography = get<{
      id: string
      title: string
      style: string
      language: string
      start_year: number | null
      end_year: number | null
      content: string
      created_at: string
      updated_at: string
    }>(db, `SELECT * FROM biographies WHERE id = ?`, [id])

    if (!biography) {
      res.status(404).json({ success: false, error: 'Biography not found' })
      return
    }

    res.json({ success: true, data: biography })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    const { id } = req.params
    const { title, style, language, content, startYear, endYear } = req.body

    const existing = get(db, `SELECT id FROM biographies WHERE id = ?`, [id])
    if (!existing) {
      res.status(404).json({ success: false, error: 'Biography not found' })
      return
    }

    run(db, `UPDATE biographies SET title = ?, style = ?, language = ?, content = ?, start_year = ?, end_year = ?, updated_at = datetime('now') WHERE id = ?`, [
      title, style, language, content, startYear, endYear, id,
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

    const existing = get(db, `SELECT id FROM biographies WHERE id = ?`, [id])
    if (!existing) {
      res.status(404).json({ success: false, error: 'Biography not found' })
      return
    }

    run(db, `DELETE FROM biographies WHERE id = ?`, [id])

    res.json({ success: true, data: { id } })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

export default router
