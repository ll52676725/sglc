import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DB_PATH = path.resolve(__dirname, 'data', 'memory.db')
const UPLOADS_DIR = path.resolve(__dirname, 'uploads')

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function generateRandomDate(startDate, endDate) {
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  const randomTime = start + Math.random() * (end - start)
  return new Date(randomTime).toISOString()
}

const LOCATIONS = [
  '北京故宫', '上海外滩', '杭州西湖', '成都锦里', '西安兵马俑',
  '大理古城', '三亚亚龙湾', '厦门鼓浪屿', '黄山', '家里',
  '公司', '公园', '咖啡馆', '健身房', '餐厅'
]

const DESCRIPTIONS = [
  '美丽的风景', '难忘的时刻', '快乐的一天', '珍贵的回忆',
  '美好的瞬间', '精彩的画面', '温馨的场景', '动人的画面',
  '自然风光', '城市风光', '日常生活', '旅行记录'
]

async function importMedia() {
  console.log('=== 开始导入媒体文件 ===\n')

  const SQL = await initSqlJs()
  let db
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  const endDate = new Date().toISOString()
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - 6)
  const startDateStr = startDate.toISOString()

  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log('uploads目录不存在')
    return
  }

  const files = fs.readdirSync(UPLOADS_DIR)
  const mediaFiles = files.filter(f => !f.startsWith('.'))
  
  console.log(`找到 ${mediaFiles.length} 个媒体文件\n`)

  const importedIds = []

  for (const file of mediaFiles) {
    const ext = path.extname(file).toLowerCase()
    const isVideo = ['.mp4', '.mov', '.avi', '.mkv'].includes(ext)
    const isPhoto = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)
    
    if (!isVideo && !isPhoto) continue

    const mediaId = uuidv4()
    const type = isVideo ? 'video' : 'photo'
    const url = `/uploads/${file}`
    const thumbnailUrl = isPhoto ? url : ''
    const dateTaken = generateRandomDate(startDateStr, endDate)
    const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)]
    const description = DESCRIPTIONS[Math.floor(Math.random() * DESCRIPTIONS.length)]

    db.run(
      `INSERT INTO media (id, type, filename, url, thumbnail_url, date_taken, location, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [mediaId, type, file, url, thumbnailUrl, dateTaken, location, description]
    )

    importedIds.push({ id: mediaId, type })
    console.log(`  ✓ 导入: ${file} (${type})`)
  }

  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(DB_PATH, buffer)

  console.log(`\n=== 导入完成 ===`)
  console.log(`✓ 成功导入 ${importedIds.length} 个媒体文件`)
  
  return importedIds
}

importMedia().catch(console.error)
