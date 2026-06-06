import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DB_PATH = path.resolve(__dirname, 'data', 'memory.db')

const MOODS = ['happy', 'excited', 'peaceful', 'grateful', 'love', 'nostalgic', 'sad', 'anxious', 'angry', 'tired', 'sick', 'thinking']
const WEATHERS = ['sunny', 'cloudy', 'overcast', 'rain', 'snow', 'wind', 'fog', 'storm']
const ALBUM_CATEGORIES = ['holiday', 'travel', 'daily', 'milestone', 'other']

const LOCATIONS = [
  '北京故宫', '上海外滩', '广州塔', '深圳欢乐谷', '杭州西湖',
  '成都锦里', '西安兵马俑', '重庆洪崖洞', '武汉黄鹤楼', '南京夫子庙',
  '苏州园林', '大理古城', '丽江古镇', '三亚亚龙湾', '厦门鼓浪屿',
  '青岛栈桥', '大连老虎滩', '桂林山水', '张家界', '黄山',
  '公司', '家里', '咖啡馆', '健身房', '超市',
  '电影院', '餐厅', '公园', '学校', '医院',
  '图书馆', '博物馆', '体育馆', '火车站', '机场'
]

const MOMENT_CONTENTS = [
  '今天天气真好，阳光明媚，心情也跟着好起来了',
  '和朋友一起吃了一顿美味的火锅，聊得很开心',
  '加班到很晚，但是完成了一个重要项目，感觉很有成就感',
  '周末去爬山，山顶风景太美了，虽然很累但是值得',
  '和家人一起看了一部电影，度过了温馨的夜晚',
  '今天收到了一个惊喜礼物，开心了一整天',
  '学习了新技能，虽然很难但很有收获',
  '下雨天，在家看书听音乐，享受安静的时光',
  '和好久不见的朋友聚会，回忆了很多往事',
  '尝试做了一道新菜，味道还不错，下次继续努力',
  '去了一家新开的咖啡店，环境很好，咖啡也很棒',
  '今天跑步突破了自己的记录，感觉身体更健康了',
  '在公园散步，看到了很多漂亮的花，春天真美好',
  '工作中遇到了一些挑战，但是最终解决了，很开心',
  '和家人一起做饭，大家分工合作，很温馨',
  '今天看了一场精彩的演出，表演者都很厉害',
  '整理了房间，扔掉了很多不需要的东西，感觉轻松了',
  '去图书馆学习，安静的环境让效率很高',
  '和朋友一起打游戏，玩得很尽兴',
  '今天的日落特别美，拍了很多照片',
  '参加了一个志愿者活动，帮助别人感觉很快乐',
  '学习了一首新歌，虽然还不太熟练但很喜欢',
  '去健身房锻炼，出了一身汗，感觉很舒服',
  '和同事一起聚餐，气氛很融洽',
  '今天做了一个重要的决定，希望是对的',
  '看了一本很有意思的书，学到了很多新知识',
  '去海边玩，吹着海风，听着海浪声，很放松',
  '今天遇到了一件有趣的事，想起来就想笑',
  '和家人一起去旅行，看到了很多美丽的风景',
  '工作得到了领导的表扬，感觉很受鼓舞',
  '今天尝试了一种新的运动，很刺激',
  '在家看了一部经典电影，感触很深',
  '和朋友一起逛街，买了很多喜欢的东西',
  '今天的月亮特别圆，特别亮',
  '学习了一门新语言的基础，感觉很有趣',
  '去参观了一个展览，开阔了眼界',
  '和家人一起包饺子，其乐融融',
  '今天完成了一个很久没完成的任务，如释重负',
  '在公园看到了可爱的小动物，心情很好',
  '和朋友一起去看演唱会，气氛超棒',
  '今天天气很凉爽，适合户外活动',
  '工作中学习了新的技术，对未来更有信心了',
  '去了一个很有特色的餐厅，体验很棒',
  '今天和好久没联系的朋友通了电话，聊了很久',
  '在家做了一些手工，很有成就感',
  '去看了一场体育比赛，很精彩',
  '今天的早餐特别丰盛，一天都有好心情',
  '和家人一起散步，聊了很多心里话',
  '工作虽然很忙，但过得很充实',
  '今天做了一个美梦，希望能成真'
]

const TAGS = [
  '工作', '生活', '旅行', '美食', '运动', '学习',
  '家庭', '朋友', '电影', '音乐', '阅读', '摄影',
  '健康', '成长', '感恩', '快乐', '回忆', '梦想',
  '挑战', '冒险', '休闲', '娱乐', '艺术', '文化',
  '自然', '风景', '节日', '生日', '纪念日', '购物'
]

const ALBUM_NAMES = [
  '2026年春节', '云南之旅', '日常生活', '生日派对', '公司年会',
  '毕业纪念', '夏日海边', '秋季赏枫', '冬日雪景', '春日赏花',
  '家庭聚会', '朋友相聚', '美食探店', '健身打卡', '学习成长',
  '工作日常', '出差记录', '演唱会', '电影记录', '阅读时光',
  '手工作品', '摄影作品', '宠物日常', '花园日记', '厨房实验',
  '城市探索', '乡村体验', '户外探险', '文化之旅', '艺术展览',
  '音乐节', '体育赛事', '节日庆祝', '纪念日', '旅行足迹',
  '美食之旅', '自然风光', '人文景观', '城市夜景', '日出日落',
  '星空观测', '雨天随拍', '晴天漫步', '周末出游', '假期生活',
  '新学期', '新项目启动', '团队建设', '公益活动', '志愿者服务'
]

const ALBUM_DESCRIPTIONS = [
  '记录这段美好时光的点点滴滴',
  '珍贵的回忆，值得永远珍藏',
  '那些年我们一起走过的日子',
  '生活中的小确幸',
  '每一张照片都是一个故事',
  '用镜头捕捉生活的美好',
  '时光不老，我们不散',
  '一路走来，感恩有你',
  '这是我们共同的回忆',
  '岁月静好，现世安稳',
  '青春的印记',
  '成长的足迹',
  '旅途的风景',
  '美食的诱惑',
  '运动的快乐',
  '学习的收获',
  '家庭的温暖',
  '友情的珍贵',
  '音乐的魅力',
  '阅读的乐趣'
]

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function getRandomItems(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

function generateRandomDate(startDate, endDate) {
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  const randomTime = start + Math.random() * (end - start)
  return new Date(randomTime).toISOString()
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

async function initDb() {
  const SQL = await initSqlJs()
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH)
    return new SQL.Database(fileBuffer)
  }
  return new SQL.Database()
}

function saveDb(db) {
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(DB_PATH, buffer)
}

function getAllMedia(db) {
  const stmt = db.prepare('SELECT id, type FROM media')
  const media = []
  while (stmt.step()) {
    media.push(stmt.getAsObject())
  }
  stmt.free()
  return media
}

async function regenerateMockData() {
  console.log('=== 重新生成Mock数据 ===\n')

  const db = await initDb()
  const allMedia = getAllMedia(db)
  
  console.log(`现有媒体文件: ${allMedia.length} 个\n`)

  console.log('清空旧数据...')
  db.run('DELETE FROM moment_media')
  db.run('DELETE FROM moment_tags')
  db.run('DELETE FROM moments')
  db.run('DELETE FROM media_albums')
  db.run('DELETE FROM albums')
  console.log('  ✓ 旧数据已清空\n')

  const endDate = new Date().toISOString()
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - 6)
  const startDateStr = startDate.toISOString()

  console.log(`时间范围: ${startDateStr.slice(0, 10)} 至 ${endDate.slice(0, 10)}\n`)

  console.log('1. 生成50条时光动态...')
  for (let i = 0; i < 50; i++) {
    const momentId = uuidv4()
    const content = getRandomItem(MOMENT_CONTENTS)
    const mood = getRandomItem(MOODS)
    const weather = getRandomItem(WEATHERS)
    const location = getRandomItem(LOCATIONS)
    const happenedAt = generateRandomDate(startDateStr, endDate)
    const tagCount = Math.floor(Math.random() * 4) + 1
    const momentTags = getRandomItems(TAGS, tagCount)

    db.run(
      `INSERT INTO moments (id, content, mood, weather, location, happened_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [momentId, content, mood, weather, location, happenedAt]
    )

    for (const tag of momentTags) {
      db.run(
        `INSERT INTO moment_tags (id, moment_id, tag) VALUES (?, ?, ?)`,
        [uuidv4(), momentId, tag]
      )
    }

    const mediaCount = Math.floor(Math.random() * 4)
    if (mediaCount > 0 && allMedia.length > 0) {
      const selectedMedia = getRandomItems(allMedia, Math.min(mediaCount, allMedia.length))
      selectedMedia.forEach((media, index) => {
        db.run(
          `INSERT OR IGNORE INTO moment_media (moment_id, media_id, sort_order) VALUES (?, ?, ?)`,
          [momentId, media.id, index]
        )
      })
    }

    if ((i + 1) % 10 === 0) {
      console.log(`   ✓ 已生成 ${i + 1} 条`)
    }
  }

  console.log('\n2. 生成50个相册...')
  
  for (let i = 0; i < 50; i++) {
    const albumId = uuidv4()
    const name = ALBUM_NAMES[i % ALBUM_NAMES.length] + (i >= ALBUM_NAMES.length ? ` ${Math.floor(i / ALBUM_NAMES.length) + 1}` : '')
    const category = getRandomItem(ALBUM_CATEGORIES)
    const description = getRandomItem(ALBUM_DESCRIPTIONS)
    const createdAt = generateRandomDate(startDateStr, endDate)

    db.run(
      `INSERT INTO albums (id, name, category, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [albumId, name, category, description, createdAt, createdAt]
    )

    const albumMediaCount = Math.floor(Math.random() * 15) + 3
    if (allMedia.length > 0) {
      const selectedMedia = getRandomItems(allMedia, Math.min(albumMediaCount, allMedia.length))
      for (const media of selectedMedia) {
        db.run(
          `INSERT OR IGNORE INTO media_albums (media_id, album_id) VALUES (?, ?)`,
          [media.id, albumId]
        )
      }

      if (selectedMedia.length > 0) {
        const coverMedia = getRandomItem(selectedMedia)
        db.run(
          `UPDATE albums SET cover_media_id = ? WHERE id = ?`,
          [coverMedia.id, albumId]
        )
      }
    }

    if ((i + 1) % 10 === 0) {
      console.log(`   ✓ 已生成 ${i + 1} 个`)
    }
  }

  saveDb(db)

  console.log('\n=== 数据生成完成 ===')
  console.log(`✓ 时光动态: 50 条`)
  console.log(`✓ 相册: 50 个`)
  console.log(`✓ 媒体文件: ${allMedia.length} 个`)
  console.log('\n数据已保存到数据库')
}

regenerateMockData().catch(console.error)
