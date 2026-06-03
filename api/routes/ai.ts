import { Router, type Request, type Response } from 'express'
import { getDb, all } from '../db.js'

const router = Router()

const EVENT_KEYWORDS = [
  { pattern: /生日|birthday|周岁|蛋糕/, category: '生日', icon: '🎂' },
  { pattern: /婚礼|结婚|wedding|婚纱|求婚/, category: '婚礼', icon: '💒' },
  { pattern: /旅行|旅游|trip|travel|度假|vacation/, category: '旅行', icon: '✈️' },
  { pattern: /春节|过年|新年|spring festival|元旦/, category: '春节', icon: '🧧' },
  { pattern: /中秋|moon festival|月饼/, category: '中秋节', icon: '🥮' },
  { pattern: /国庆|national day/, category: '国庆节', icon: '🇨🇳' },
  { pattern: /圣诞|christmas|xmas/, category: '圣诞节', icon: '🎄' },
  { pattern: /毕业|graduation|学士服/, category: '毕业', icon: '🎓' },
  { pattern: /开学|school|入学/, category: '开学', icon: '📚' },
  { pattern: /运动|sport|篮球|足球|跑步|健身/, category: '运动', icon: '⚽' },
  { pattern: /美食|food|餐厅|吃饭|烹饪/, category: '美食', icon: '🍜' },
  { pattern: /宠物|pet|猫|狗|cat|dog/, category: '宠物', icon: '🐱' },
  { pattern: /风景|scenery|山|海|湖|日落|sunset|日出/, category: '风景', icon: '🏔️' },
  { pattern: /家庭|family|聚会|团聚/, category: '家庭聚会', icon: '👨‍👩‍👧‍👦' },
  { pattern: /朋友|friend|聚会|party/, category: '朋友聚会', icon: '🎉' },
  { pattern: /演出|音乐会|concert|演唱会/, category: '演出', icon: '🎵' },
  { pattern: /展览|exhibition|博物馆|museum|画展/, category: '展览', icon: '🎨' },
]

const SEASON_KEYWORDS = [
  { pattern: /春天|春|spring|樱花|桃花|花开/, season: '春天', icon: '🌸' },
  { pattern: /夏天|夏|summer|海滩|海边|游泳|西瓜/, season: '夏天', icon: '☀️' },
  { pattern: /秋天|秋|autumn|fall|枫叶|落叶/, season: '秋天', icon: '🍂' },
  { pattern: /冬天|冬|winter|雪|滑雪|圣诞/, season: '冬天', icon: '❄️' },
]

function analyzeEvent(description: string, tags: string[]): { category: string; icon: string } | null {
  const allText = `${description} ${tags.join(' ')}`.toLowerCase()
  for (const kw of EVENT_KEYWORDS) {
    if (kw.pattern.test(allText)) {
      return { category: kw.category, icon: kw.icon }
    }
  }
  return null
}

function analyzeSeason(description: string, tags: string[], dateTaken: string | null): { season: string; icon: string } | null {
  const allText = `${description} ${tags.join(' ')}`.toLowerCase()
  for (const kw of SEASON_KEYWORDS) {
    if (kw.pattern.test(allText)) {
      return { season: kw.season, icon: kw.icon }
    }
  }
  if (dateTaken) {
    const month = new Date(dateTaken).getMonth() + 1
    if (month >= 3 && month <= 5) return { season: '春天', icon: '🌸' }
    if (month >= 6 && month <= 8) return { season: '夏天', icon: '☀️' }
    if (month >= 9 && month <= 11) return { season: '秋天', icon: '🍂' }
    return { season: '冬天', icon: '❄️' }
  }
  return null
}

function analyzeColorScheme(url: string): { primary: string; secondary: string } | null {
  const colors = [
    { name: '暖色调', primary: '#FFD700', secondary: '#FF8C00' },
    { name: '冷色调', primary: '#4682B4', secondary: '#2F4F4F' },
    { name: '自然色', primary: '#228B22', secondary: '#8B4513' },
    { name: '柔和色', primary: '#DDA0DD', secondary: '#FFB6C1' },
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

function getTimeOfDay(dateTaken: string | null): string | null {
  if (!dateTaken) return null
  const hour = new Date(dateTaken).getHours()
  if (hour >= 5 && hour < 9) return '清晨'
  if (hour >= 9 && hour < 12) return '上午'
  if (hour >= 12 && hour < 14) return '中午'
  if (hour >= 14 && hour < 18) return '下午'
  if (hour >= 18 && hour < 21) return '傍晚'
  return '夜晚'
}

router.get('/classify/:albumId?', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    const { albumId } = req.params

    let whereClause = 'WHERE 1=1'
    const params: unknown[] = []

    if (albumId && albumId !== 'all') {
      whereClause += ` AND m.id IN (SELECT ma.media_id FROM media_albums ma WHERE ma.album_id = ?)`
      params.push(albumId)
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
      `SELECT m.* FROM media m ${whereClause} ORDER BY m.date_taken DESC NULLS LAST`,
      params,
    )

    const peopleMap = new Map<string, Set<string>>()
    const locationMap = new Map<string, Set<string>>()
    const tagMap = new Map<string, Set<string>>()
    const eventMap = new Map<string, { icon: string; media: Set<string> }>()
    const seasonMap = new Map<string, { icon: string; media: Set<string> }>()
    const timeOfDayMap = new Map<string, Set<string>>()
    const monthMap = new Map<string, Set<string>>()
    const yearMap = new Map<string, Set<string>>()

    for (const row of mediaRows) {
      const people = all<{ name: string }>(db, `SELECT name FROM media_people WHERE media_id = ?`, [row.id])
      const tags = all<{ tag: string }>(db, `SELECT tag FROM media_tags WHERE media_id = ?`, [row.id])
      const tagList = tags.map(t => t.tag)

      for (const p of people) {
        if (!peopleMap.has(p.name)) peopleMap.set(p.name, new Set())
        peopleMap.get(p.name)!.add(row.id)
      }

      if (row.location && row.location.trim()) {
        if (!locationMap.has(row.location)) locationMap.set(row.location, new Set())
        locationMap.get(row.location)!.add(row.id)
      }

      for (const t of tagList) {
        if (!tagMap.has(t)) tagMap.set(t, new Set())
        tagMap.get(t)!.add(row.id)
      }

      const event = analyzeEvent(row.description, tagList)
      if (event) {
        if (!eventMap.has(event.category)) {
          eventMap.set(event.category, { icon: event.icon, media: new Set() })
        }
        eventMap.get(event.category)!.media.add(row.id)
      }

      const season = analyzeSeason(row.description, tagList, row.date_taken)
      if (season) {
        if (!seasonMap.has(season.season)) {
          seasonMap.set(season.season, { icon: season.icon, media: new Set() })
        }
        seasonMap.get(season.season)!.media.add(row.id)
      }

      const timeOfDay = getTimeOfDay(row.date_taken)
      if (timeOfDay) {
        if (!timeOfDayMap.has(timeOfDay)) timeOfDayMap.set(timeOfDay, new Set())
        timeOfDayMap.get(timeOfDay)!.add(row.id)
      }

      if (row.date_taken) {
        const d = new Date(row.date_taken)
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const yearKey = String(d.getFullYear())
        if (!monthMap.has(monthKey)) monthMap.set(monthKey, new Set())
        monthMap.get(monthKey)!.add(row.id)
        if (!yearMap.has(yearKey)) yearMap.set(yearKey, new Set())
        yearMap.get(yearKey)!.add(row.id)
      }
    }

    const autoAlbumSuggestions = []
    if (peopleMap.size >= 2) {
      for (const [name, ids] of peopleMap) {
        if (ids.size >= 3) {
          autoAlbumSuggestions.push({
            type: 'people',
            name: `${name}的相册`,
            description: `所有包含${name}的照片`,
            icon: '👤',
            mediaIds: Array.from(ids),
            count: ids.size,
          })
        }
      }
    }
    if (locationMap.size >= 2) {
      for (const [location, ids] of locationMap) {
        if (ids.size >= 2) {
          autoAlbumSuggestions.push({
            type: 'location',
            name: `${location}之旅`,
            description: `在${location}拍摄的所有照片`,
            icon: '📍',
            mediaIds: Array.from(ids),
            count: ids.size,
          })
        }
      }
    }
    for (const [category, data] of eventMap) {
      if (data.media.size >= 2) {
        autoAlbumSuggestions.push({
          type: 'event',
          name: `${category}纪念`,
          description: `所有${category}相关的照片`,
          icon: data.icon,
          mediaIds: Array.from(data.media),
          count: data.media.size,
        })
      }
    }

    const groups = {
      people: Array.from(peopleMap.entries()).map(([name, ids]) => ({
        name,
        mediaIds: Array.from(ids),
        count: ids.size,
        icon: '👤',
      })).sort((a, b) => b.count - a.count),
      locations: Array.from(locationMap.entries()).map(([name, ids]) => ({
        name,
        mediaIds: Array.from(ids),
        count: ids.size,
        icon: '📍',
      })).sort((a, b) => b.count - a.count),
      tags: Array.from(tagMap.entries()).map(([name, ids]) => ({
        name,
        mediaIds: Array.from(ids),
        count: ids.size,
        icon: '🏷️',
      })).sort((a, b) => b.count - a.count),
      events: Array.from(eventMap.entries()).map(([name, data]) => ({
        name,
        mediaIds: Array.from(data.media),
        count: data.media.size,
        icon: data.icon,
      })).sort((a, b) => b.count - a.count),
      seasons: Array.from(seasonMap.entries()).map(([name, data]) => ({
        name,
        mediaIds: Array.from(data.media),
        count: data.media.size,
        icon: data.icon,
      })),
      timeOfDay: Array.from(timeOfDayMap.entries()).map(([name, ids]) => ({
        name,
        mediaIds: Array.from(ids),
        count: ids.size,
        icon: '🕐',
      })),
      months: Array.from(monthMap.entries()).sort(([a], [b]) => b.localeCompare(a)).map(([name, ids]) => ({
        name: new Date(name + '-01').toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' }),
        mediaIds: Array.from(ids),
        count: ids.size,
        icon: '📅',
      })),
      years: Array.from(yearMap.entries()).sort(([a], [b]) => b.localeCompare(a)).map(([name, ids]) => ({
        name: `${name}年`,
        mediaIds: Array.from(ids),
        count: ids.size,
        icon: '📆',
      })),
    }

    const insights = []
    const topPerson = groups.people[0]
    const topLocation = groups.locations[0]
    const topTag = groups.tags[0]
    const topEvent = groups.events[0]

    if (topPerson && topPerson.count >= 5) {
      insights.push({
        type: 'person',
        title: `${topPerson.name} 是镜头中的主角`,
        description: `共有 ${topPerson.count} 张照片包含 ${topPerson.name}`,
        icon: '👤',
      })
    }
    if (topLocation && topLocation.count >= 3) {
      insights.push({
        type: 'location',
        title: `最爱去 ${topLocation.name}`,
        description: `在 ${topLocation.name} 拍摄了 ${topLocation.count} 张照片`,
        icon: '📍',
      })
    }
    if (topTag && topTag.count >= 5) {
      insights.push({
        type: 'tag',
        title: `最爱记录 "${topTag.name}"`,
        description: `共有 ${topTag.count} 张照片带有 ${topTag.name} 标签`,
        icon: '🏷️',
      })
    }
    if (topEvent) {
      insights.push({
        type: 'event',
        title: `${topEvent.icon} ${topEvent.name} 是最常记录的场景`,
        description: `共有 ${topEvent.count} 张 ${topEvent.name} 相关的照片`,
        icon: topEvent.icon,
      })
    }
    if (groups.seasons.length > 0) {
      const topSeason = groups.seasons.reduce((a, b) => a.count > b.count ? a : b)
      insights.push({
        type: 'season',
        title: `${topSeason.icon} ${topSeason.name} 是最喜欢的季节`,
        description: `${topSeason.name} 有 ${topSeason.count} 张美好记忆`,
        icon: topSeason.icon,
      })
    }

    const timelineStory = generateTimelineStory(mediaRows, groups)

    res.json({
      success: true,
      data: {
        totalMedia: mediaRows.length,
        groups,
        autoAlbumSuggestions,
        insights,
        timelineStory,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

function generateTimelineStory(mediaRows: any[], groups: any) {
  if (mediaRows.length === 0) return null

  const sortedByDate = [...mediaRows].filter((m: any) => m.date_taken).sort((a: any, b: any) =>
    new Date(a.date_taken).getTime() - new Date(b.date_taken).getTime()
  )

  if (sortedByDate.length < 3) return null

  const first = sortedByDate[0]
  const last = sortedByDate[sortedByDate.length - 1]
  const firstDate = new Date(first.date_taken)
  const lastDate = new Date(last.date_taken)
  const years = lastDate.getFullYear() - firstDate.getFullYear()
  const months = years * 12 + (lastDate.getMonth() - firstDate.getMonth())

  const chapters = []
  let currentYear: number | null = null
  let currentMedia: any[] = []

  for (const media of sortedByDate) {
    const year = new Date(media.date_taken).getFullYear()
    if (currentYear !== null && year !== currentYear) {
      if (currentMedia.length > 0) {
        chapters.push(generateYearChapter(currentYear, currentMedia, groups))
      }
      currentMedia = []
    }
    currentYear = year
    currentMedia.push(media)
  }
  if (currentYear !== null && currentMedia.length > 0) {
    chapters.push(generateYearChapter(currentYear, currentMedia, groups))
  }

  return {
    timeSpan: {
      startDate: firstDate.toISOString(),
      endDate: lastDate.toISOString(),
      years,
      months,
    },
    summary: `从 ${firstDate.toLocaleDateString('zh-CN')} 到 ${lastDate.toLocaleDateString('zh-CN')}，跨越 ${years > 0 ? `${years} 年 ` : ''}${months % 12} 个月，记录了 ${mediaRows.length} 个珍贵瞬间。`,
    chapters,
  }
}

function generateYearChapter(year: number, media: any[], groups: any) {
  const descriptions = media.map((m: any) => m.description).filter(Boolean)
  const tags = new Set<string>()
  const people = new Set<string>()
  const locations = new Set<string>()

  for (const m of media) {
    const mediaTags = groups.tags.filter((t: any) => t.mediaIds.includes(m.id)).map((t: any) => t.name)
    const mediaPeople = groups.people.filter((p: any) => p.mediaIds.includes(m.id)).map((p: any) => p.name)
    mediaTags.forEach((t: string) => tags.add(t))
    mediaPeople.forEach((p: string) => people.add(p))
    if (m.location) locations.add(m.location)
  }

  const highlights = []
  const topTags = Array.from(tags).slice(0, 3)
  const topPeople = Array.from(people).slice(0, 3)
  const topLocations = Array.from(locations).slice(0, 3)

  if (topPeople.length > 0) {
    highlights.push(`👤 ${topPeople.join('、')} 陪伴左右`)
  }
  if (topLocations.length > 0) {
    highlights.push(`📍 足迹遍布 ${topLocations.join('、')}`)
  }
  if (topTags.length > 0) {
    highlights.push(`🏷️ 最爱记录 ${topTags.join('、')}`)
  }

  return {
    year,
    title: `${year} 年`,
    mediaCount: media.length,
    highlights,
    keyMoments: descriptions.length > 0 ? descriptions.slice(0, 3) : [],
  }
}

export default router
