import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DB_PATH = path.resolve(__dirname, 'data', 'memory.db')
const UPLOADS_DIR = path.resolve(__dirname, 'uploads')

const MOODS = ['happy', 'excited', 'peaceful', 'grateful', 'love', 'nostalgic', 'sad', 'anxious', 'angry', 'tired', 'sick', 'thinking']
const WEATHERS = ['sunny', 'cloudy', 'overcast', 'rain', 'snow', 'wind', 'fog', 'storm']
const ALBUM_CATEGORIES = ['holiday', 'travel', 'daily', 'milestone', 'other']

const ALL_TAGS = [
  '工作', '生活', '旅行', '美食', '运动', '学习',
  '家庭', '朋友', '电影', '音乐', '阅读', '摄影',
  '健康', '成长', '感恩', '快乐', '回忆', '梦想',
  '挑战', '冒险', '休闲', '娱乐', '艺术', '文化',
  '自然', '风景', '节日', '生日', '纪念日', '购物',
  '春节', '元旦', '中秋', '国庆', '五一', '端午',
  '情人节', '圣诞节', '毕业', '升职', '搬家',
  '健身', '跑步', '瑜伽', '游泳', '爬山', '骑行',
  '做饭', '烘焙', '咖啡', '读书', '写作', '画画'
]

const LOCATIONS = [
  '北京故宫', '北京天安门', '北京颐和园', '北京八达岭长城', '北京798艺术区',
  '上海外滩', '上海东方明珠', '上海迪士尼', '上海田子坊', '上海豫园',
  '广州塔', '广州长隆', '广州沙面', '深圳欢乐谷', '深圳世界之窗',
  '杭州西湖', '杭州灵隐寺', '杭州千岛湖', '苏州园林', '苏州周庄',
  '成都锦里', '成都宽窄巷子', '成都大熊猫基地', '重庆洪崖洞', '重庆解放碑',
  '西安兵马俑', '西安大雁塔', '西安古城墙', '武汉黄鹤楼', '武汉东湖',
  '南京夫子庙', '南京中山陵', '厦门鼓浪屿', '厦门曾厝垵', '大理古城',
  '丽江古镇', '丽江玉龙雪山', '三亚亚龙湾', '三亚天涯海角', '青岛栈桥',
  '大连老虎滩', '桂林山水', '张家界', '黄山', '泰山',
  '家里', '公司', '咖啡馆', '健身房', '超市',
  '电影院', '餐厅', '公园', '学校', '医院',
  '图书馆', '博物馆', '体育馆', '火车站', '机场'
]

const MONTHLY_THEMES = {
  1: {
    name: '一月·新年伊始',
    moments: [
      { content: '元旦快乐！新的一年，新的开始，立下今年的flag，希望都能实现', mood: 'excited', weather: 'cold', tags: ['元旦', '新年', '梦想'] },
      { content: '今年第一场雪，银装素裹的世界真美，堆了个丑丑的雪人', mood: 'happy', weather: 'snow', tags: ['雪', '冬天', '快乐'] },
      { content: '腊八节喝腊八粥，暖暖的，家的味道', mood: 'grateful', weather: 'cold', tags: ['腊八节', '美食', '家庭'] },
      { content: '加班准备年终总结，虽然累但收获满满', mood: 'tired', weather: 'cold', tags: ['工作', '年终', '成长'] },
      { content: '和家人一起置办年货，年味越来越浓了', mood: 'happy', weather: 'sunny', tags: ['春节', '家庭', '购物'] },
    ]
  },
  2: {
    name: '二月·新春佳节',
    moments: [
      { content: '小年快乐，扫尘祭灶，迎接新年', mood: 'happy', weather: 'sunny', tags: ['小年', '春节', '家庭'] },
      { content: '除夕夜，一家人围坐吃年夜饭，看春晚，守岁', mood: 'love', weather: 'cloudy', tags: ['春节', '年夜饭', '家庭'] },
      { content: '大年初一，拜年啦！恭喜发财，红包拿来', mood: 'excited', weather: 'sunny', tags: ['春节', '拜年', '快乐'] },
      { content: '走亲戚，见了好久不见的表弟表妹，大家都长大了', mood: 'nostalgic', weather: 'cloudy', tags: ['春节', '亲戚', '回忆'] },
      { content: '情人节，和另一半度过了浪漫的一天', mood: 'love', weather: 'sunny', tags: ['情人节', '浪漫', '爱情'] },
      { content: '元宵节，吃汤圆，赏花灯，猜灯谜', mood: 'happy', weather: 'cloudy', tags: ['元宵节', '美食', '传统'] },
    ]
  },
  3: {
    name: '三月·春暖花开',
    moments: [
      { content: '惊蛰了，万物复苏，春天真的来了', mood: 'peaceful', weather: 'sunny', tags: ['春天', '自然', '节气'] },
      { content: '妇女节，给妈妈和自己都买了礼物，要好好爱自己', mood: 'grateful', weather: 'sunny', tags: ['妇女节', '感恩', '购物'] },
      { content: '植树节，去郊外种了一棵树，希望它茁壮成长', mood: 'peaceful', weather: 'sunny', tags: ['植树节', '环保', '自然'] },
      { content: '玉兰花盛开了，白白粉粉的，春天太美了', mood: 'happy', weather: 'sunny', tags: ['春天', '花', '摄影'] },
      { content: '周末去爬山，山顶的风景太棒了，虽然腿很酸', mood: 'tired', weather: 'sunny', tags: ['运动', '爬山', '风景'] },
    ]
  },
  4: {
    name: '四月·清明时节',
    moments: [
      { content: '清明节，扫墓祭祖，缅怀先人', mood: 'nostalgic', weather: 'rain', tags: ['清明节', '祭祖', '回忆'] },
      { content: '樱花盛开的季节，去武大看樱花，人很多但花很美', mood: 'happy', weather: 'sunny', tags: ['樱花', '春天', '旅行'] },
      { content: '谷雨，春天的最后一个节气，雨水滋润大地', mood: 'peaceful', weather: 'rain', tags: ['谷雨', '春天', '自然'] },
      { content: '世界读书日，今天读了一本好书，收获良多', mood: 'thinking', weather: 'cloudy', tags: ['读书', '学习', '成长'] },
      { content: '五一假期前的最后一个工作日，心已经飞了', mood: 'excited', weather: 'sunny', tags: ['工作', '假期', '期待'] },
    ]
  },
  5: {
    name: '五月·劳动光荣',
    moments: [
      { content: '五一劳动节，劳动最光荣！今天在家大扫除', mood: 'tired', weather: 'sunny', tags: ['五一', '劳动', '打扫'] },
      { content: '五四青年节，永远年轻，永远热泪盈眶', mood: 'excited', weather: 'sunny', tags: ['青年节', '青春', '梦想'] },
      { content: '立夏了，夏天正式开始，又可以吃冰淇淋了', mood: 'happy', weather: 'sunny', tags: ['立夏', '夏天', '美食'] },
      { content: '母亲节，给妈妈做了一顿饭，她很开心', mood: 'love', weather: 'sunny', tags: ['母亲节', '感恩', '家庭'] },
      { content: '520，和爱的人在一起，每天都是情人节', mood: 'love', weather: 'sunny', tags: ['520', '爱情', '浪漫'] },
      { content: '小满，麦粒渐满，收获的季节快要到了', mood: 'peaceful', weather: 'cloudy', tags: ['小满', '节气', '自然'] },
    ]
  },
  6: {
    name: '六月·盛夏时光',
    moments: [
      { content: '六一儿童节，虽然长大了，但还是要保持童心', mood: 'happy', weather: 'sunny', tags: ['儿童节', '快乐', '童心'] },
      { content: '芒种，忙着播种，忙着收获', mood: 'peaceful', weather: 'sunny', tags: ['芒种', '节气', '自然'] },
      { content: '端午节，吃粽子，赛龙舟，纪念屈原', mood: 'peaceful', weather: 'cloudy', tags: ['端午节', '美食', '传统'] },
      { content: '父亲节，爸爸辛苦了，我爱你', mood: 'grateful', weather: 'sunny', tags: ['父亲节', '感恩', '家庭'] },
      { content: '夏至，一年中白天最长的一天', mood: 'peaceful', weather: 'sunny', tags: ['夏至', '节气', '夏天'] },
      { content: '毕业季，看到学弟学妹们毕业，想起了自己的学生时代', mood: 'nostalgic', weather: 'sunny', tags: ['毕业', '回忆', '青春'] },
    ]
  },
  7: {
    name: '七月·盛夏炎炎',
    moments: [
      { content: '建党节，祝福祖国繁荣昌盛', mood: 'grateful', weather: 'sunny', tags: ['建党节', '爱国', '感恩'] },
      { content: '小暑，天气越来越热了，只想待在空调房里', mood: 'tired', weather: 'sunny', tags: ['小暑', '夏天', '热'] },
      { content: '今天去游泳了，夏天泡在水里真舒服', mood: 'happy', weather: 'sunny', tags: ['游泳', '运动', '夏天'] },
      { content: '大暑，一年中最热的时候，吃西瓜消暑', mood: 'happy', weather: 'sunny', tags: ['大暑', '夏天', '美食'] },
      { content: '周末在家做烘焙，烤了个戚风蛋糕，虽然有点丑但很好吃', mood: 'happy', weather: 'cloudy', tags: ['烘焙', '美食', '休闲'] },
    ]
  },
  8: {
    name: '八月·夏末秋初',
    moments: [
      { content: '建军节，致敬最可爱的人', mood: 'grateful', weather: 'sunny', tags: ['建军节', '爱国', '感恩'] },
      { content: '立秋了，虽然还是很热，但秋天的脚步近了', mood: 'peaceful', weather: 'sunny', tags: ['立秋', '节气', '秋天'] },
      { content: '七夕节，牛郎织女鹊桥相会的日子', mood: 'love', weather: 'cloudy', tags: ['七夕', '情人节', '浪漫'] },
      { content: '处暑，夏天正式结束了，终于凉快了', mood: 'happy', weather: 'cloudy', tags: ['处暑', '节气', '夏天'] },
      { content: '暑假快结束了，抓紧时间玩', mood: 'excited', weather: 'sunny', tags: ['暑假', '休闲', '快乐'] },
    ]
  },
  9: {
    name: '九月·金秋九月',
    moments: [
      { content: '白露，天气转凉，早晚有露水了', mood: 'peaceful', weather: 'cloudy', tags: ['白露', '节气', '秋天'] },
      { content: '开学季，看到学生们背着书包上学，想起了自己的学生时代', mood: 'nostalgic', weather: 'sunny', tags: ['开学', '回忆', '学习'] },
      { content: '教师节，感恩生命中遇到的每一位老师', mood: 'grateful', weather: 'sunny', tags: ['教师节', '感恩', '学习'] },
      { content: '中秋节，月圆人团圆，吃月饼赏月', mood: 'love', weather: 'sunny', tags: ['中秋节', '团圆', '美食'] },
      { content: '秋分，昼夜平分，秋色渐浓', mood: 'peaceful', weather: 'sunny', tags: ['秋分', '节气', '秋天'] },
    ]
  },
  10: {
    name: '十月·国庆佳节',
    moments: [
      { content: '国庆节快乐！祝福祖国生日快乐', mood: 'excited', weather: 'sunny', tags: ['国庆节', '爱国', '假期'] },
      { content: '国庆假期出去旅游，人虽然多但玩得很开心', mood: 'happy', weather: 'sunny', tags: ['旅行', '假期', '风景'] },
      { content: '寒露，天气越来越冷了，注意保暖', mood: 'peaceful', weather: 'cloudy', tags: ['寒露', '节气', '秋天'] },
      { content: '重阳节，登高望远，敬老爱老', mood: 'grateful', weather: 'sunny', tags: ['重阳节', '传统', '感恩'] },
      { content: '霜降，秋天的最后一个节气，冬天快要来了', mood: 'peaceful', weather: 'cold', tags: ['霜降', '节气', '秋天'] },
    ]
  },
  11: {
    name: '十一月·深秋初冬',
    moments: [
      { content: '立冬了，冬天正式开始，又可以吃火锅了', mood: 'happy', weather: 'cold', tags: ['立冬', '冬天', '美食'] },
      { content: '双十一，买买买！今年剁手了好多东西', mood: 'excited', weather: 'cloudy', tags: ['双十一', '购物', '快乐'] },
      { content: '小雪，虽然没下雪，但天气越来越冷了', mood: 'cold', weather: 'cold', tags: ['小雪', '节气', '冬天'] },
      { content: '感恩节，感谢生命中遇到的每一个人', mood: 'grateful', weather: 'sunny', tags: ['感恩节', '感恩', '生活'] },
      { content: '今天在家吃火锅，暖暖的，很幸福', mood: 'love', weather: 'cold', tags: ['美食', '火锅', '家庭'] },
    ]
  },
  12: {
    name: '十二月·岁末年终',
    moments: [
      { content: '大雪，期待一场真正的大雪', mood: 'peaceful', weather: 'cold', tags: ['大雪', '节气', '冬天'] },
      { content: '冬至，吃饺子，不然耳朵会冻掉哦', mood: 'happy', weather: 'cold', tags: ['冬至', '美食', '传统'] },
      { content: '平安夜，祝大家平平安安', mood: 'peaceful', weather: 'cold', tags: ['平安夜', '节日', '祝福'] },
      { content: '圣诞节，虽然是洋节，但也凑个热闹', mood: 'happy', weather: 'cold', tags: ['圣诞节', '节日', '快乐'] },
      { content: '一年快结束了，回顾这一年，收获很多', mood: 'thinking', weather: 'cloudy', tags: ['年终', '总结', '成长'] },
      { content: '跨年啦！新年快乐，明年会更好', mood: 'excited', weather: 'cold', tags: ['跨年', '新年', '期待'] },
    ]
  }
}

const ALBUM_TEMPLATES = [
  { name: '2025年春节', category: 'holiday', description: '阖家团圆的新春佳节', months: [2] },
  { name: '冬季雪景', category: 'daily', description: '银装素裹的美丽世界', months: [1, 12] },
  { name: '春日赏花', category: 'travel', description: '春暖花开的季节', months: [3, 4] },
  { name: '五一出游', category: 'travel', description: '五一假期的美好时光', months: [5] },
  { name: '夏日海边', category: 'travel', description: '清凉一夏的海边之旅', months: [7, 8] },
  { name: '端午节', category: 'holiday', description: '粽叶飘香的传统节日', months: [6] },
  { name: '中秋节', category: 'holiday', description: '月圆人团圆', months: [9] },
  { name: '国庆假期', category: 'holiday', description: '金秋十月的假期', months: [10] },
  { name: '秋日赏枫', category: 'travel', description: '层林尽染的秋天', months: [10, 11] },
  { name: '日常生活', category: 'daily', description: '记录生活中的小确幸', months: [1,2,3,4,5,6,7,8,9,10,11,12] },
  { name: '美食探店', category: 'daily', description: '那些年吃过的美食', months: [1,2,3,4,5,6,7,8,9,10,11,12] },
  { name: '健身打卡', category: 'milestone', description: '运动使我快乐', months: [1,2,3,4,5,6,7,8,9,10,11,12] },
  { name: '工作日常', category: 'daily', description: '努力工作的每一天', months: [1,2,3,4,5,6,7,8,9,10,11,12] },
  { name: '家庭聚会', category: 'milestone', description: '和家人在一起的时光', months: [1,2,10,12] },
  { name: '生日记录', category: 'milestone', description: '又长大了一岁', months: [6] },
  { name: '圣诞节', category: 'holiday', description: '欢乐的圣诞季', months: [12] },
]

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function getRandomItems(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, Math.min(count, arr.length))
}

function getRandomDateInMonth(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate()
  const day = Math.floor(Math.random() * daysInMonth) + 1
  const hour = Math.floor(Math.random() * 14) + 7
  const minute = Math.floor(Math.random() * 60)
  return new Date(year, month - 1, day, hour, minute).toISOString()
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

function importMediaFiles(db) {
  if (!fs.existsSync(UPLOADS_DIR)) return []
  
  const files = fs.readdirSync(UPLOADS_DIR)
  const mediaFiles = files.filter(f => !f.startsWith('.'))
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
    const dateTaken = getRandomDateInMonth(2025, Math.floor(Math.random() * 12) + 1)
    const location = getRandomItem(LOCATIONS)
    const description = getRandomItem([
      '美丽的风景', '难忘的时刻', '快乐的一天', '珍贵的回忆',
      '美好的瞬间', '精彩的画面', '温馨的场景', '动人的画面',
      '自然风光', '城市风光', '日常生活', '旅行记录'
    ])

    db.run(
      `INSERT OR IGNORE INTO media (id, type, filename, url, thumbnail_url, date_taken, location, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [mediaId, type, file, url, thumbnailUrl, dateTaken, location, description]
    )

    importedIds.push({ id: mediaId, type, dateTaken })
  }

  return importedIds
}

function getAllMedia(db) {
  const stmt = db.prepare('SELECT id, type, date_taken FROM media')
  const media = []
  while (stmt.step()) {
    media.push(stmt.getAsObject())
  }
  stmt.free()
  return media
}

function getMediaForMonth(mediaList, month) {
  return mediaList.filter(m => {
    if (!m.date_taken) return true
    const d = new Date(m.date_taken)
    return d.getMonth() + 1 === month
  })
}

async function generate2025Data() {
  console.log('=== 开始生成2025年全年数据 ===\n')

  const db = await initDb()
  
  console.log('1. 导入媒体文件...')
  const mediaIds = importMediaFiles(db)
  console.log(`   ✓ 导入了 ${mediaIds.length} 个媒体文件\n`)
  
  const allMedia = getAllMedia(db)

  console.log('2. 清空旧数据...')
  db.run('DELETE FROM moment_media')
  db.run('DELETE FROM moment_tags')
  db.run('DELETE FROM moments')
  db.run('DELETE FROM media_albums')
  db.run('DELETE FROM albums')
  console.log('   ✓ 旧数据已清空\n')

  console.log('3. 生成时光动态（每月5-10条，全年约80条）...')
  let momentCount = 0

  for (let month = 1; month <= 12; month++) {
    const theme = MONTHLY_THEMES[month]
    const baseMoments = theme.moments
    const monthMedia = getMediaForMonth(allMedia, month)
    
    const extraCount = Math.floor(Math.random() * 3) + 1
    for (let i = 0; i < extraCount; i++) {
      const contents = [
        '今天工作很顺利，心情不错',
        '和朋友聚会，聊得很开心',
        '读了一本好书，推荐给大家',
        '今天天气真好，适合出去走走',
        '学习了新技能，虽然难但有收获',
        '做了一顿好吃的，很有成就感',
        '看了一部电影，很感动',
        '今天起得很早，效率很高',
        '散步的时候看到了很美的晚霞',
        '这周过得很充实'
      ]
      baseMoments.push({
        content: getRandomItem(contents),
        mood: getRandomItem(MOODS),
        weather: getRandomItem(WEATHERS),
        tags: getRandomItems(ALL_TAGS, Math.floor(Math.random() * 3) + 1)
      })
    }

    for (const momentData of baseMoments) {
      const momentId = uuidv4()
      const happenedAt = getRandomDateInMonth(2025, month)
      const location = getRandomItem(LOCATIONS)
      const tagCount = Math.floor(Math.random() * 3) + 1
      const momentTags = momentData.tags && momentData.tags.length > 0 
        ? momentData.tags 
        : getRandomItems(ALL_TAGS, tagCount)

      db.run(
        `INSERT INTO moments (id, content, mood, weather, location, happened_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [momentId, momentData.content, momentData.mood || getRandomItem(MOODS), 
         momentData.weather || getRandomItem(WEATHERS), location, happenedAt]
      )

      for (const tag of momentTags) {
        db.run(
          `INSERT INTO moment_tags (id, moment_id, tag) VALUES (?, ?, ?)`,
          [uuidv4(), momentId, tag]
        )
      }

      const mediaCount = Math.floor(Math.random() * 4)
      if (mediaCount > 0 && monthMedia.length > 0) {
        const selectedMedia = getRandomItems(monthMedia, Math.min(mediaCount, monthMedia.length))
        selectedMedia.forEach((media, index) => {
          db.run(
            `INSERT OR IGNORE INTO moment_media (moment_id, media_id, sort_order) VALUES (?, ?, ?)`,
            [momentId, media.id, index]
          )
        })
      }

      momentCount++
    }
    
    console.log(`   ✓ ${month}月: 生成了 ${baseMoments.length} 条动态`)
  }

  console.log(`\n   总计生成 ${momentCount} 条时光动态\n`)

  console.log('4. 生成相册（约15个）...')
  let albumCount = 0

  for (const albumTpl of ALBUM_TEMPLATES) {
    const albumId = uuidv4()
    const createdAt = getRandomDateInMonth(2025, getRandomItem(albumTpl.months))
    
    db.run(
      `INSERT INTO albums (id, name, category, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [albumId, albumTpl.name, albumTpl.category, albumTpl.description, createdAt, createdAt]
    )

    let albumMedia = []
    for (const month of albumTpl.months) {
      const monthMedia = getMediaForMonth(allMedia, month)
      albumMedia = albumMedia.concat(monthMedia)
    }
    
    if (albumMedia.length === 0) {
      albumMedia = allMedia
    }

    const albumMediaCount = Math.floor(Math.random() * 10) + 5
    if (albumMedia.length > 0) {
      const selectedMedia = getRandomItems(albumMedia, Math.min(albumMediaCount, albumMedia.length))
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

    albumCount++
    console.log(`   ✓ 创建相册: ${albumTpl.name}`)
  }

  console.log(`\n   总计生成 ${albumCount} 个相册\n`)

  saveDb(db)

  console.log('=== 数据生成完成 ===')
  console.log(`✓ 时光动态: ${momentCount} 条`)
  console.log(`✓ 相册: ${albumCount} 个`)
  console.log(`✓ 媒体文件: ${allMedia.length} 个`)
  console.log(`✓ 时间范围: 2025年1月 - 2025年12月`)
  console.log('\n数据已保存到数据库')
}

generate2025Data().catch(console.error)
