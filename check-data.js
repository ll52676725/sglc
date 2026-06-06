import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'

const DB_PATH = path.resolve('data/memory.db')

async function checkData() {
  const SQL = await initSqlJs()
  const fileBuffer = fs.readFileSync(DB_PATH)
  const db = new SQL.Database(fileBuffer)
  
  const momentsCount = db.exec('SELECT COUNT(*) as cnt FROM moments')[0].values[0][0]
  console.log('时光动态数量:', momentsCount)
  
  const albumsCount = db.exec('SELECT COUNT(*) as cnt FROM albums')[0].values[0][0]
  console.log('相册数量:', albumsCount)
  
  const mediaCount = db.exec('SELECT COUNT(*) as cnt FROM media')[0].values[0][0]
  console.log('媒体文件数量:', mediaCount)
  
  console.log('\n最近5条时光动态:')
  const moments = db.exec('SELECT content, mood, happened_at FROM moments ORDER BY happened_at DESC LIMIT 5')
  if (moments.length > 0) {
    moments[0].values.forEach((m, i) => {
      console.log(`  ${i+1}. [${m[1]}] ${m[0].slice(0, 20)}... (${m[2].slice(0,10)})`)
    })
  }
  
  console.log('\n最近5个相册:')
  const albums = db.exec('SELECT name, category FROM albums ORDER BY created_at DESC LIMIT 5')
  if (albums.length > 0) {
    albums[0].values.forEach((a, i) => {
      console.log(`  ${i+1}. ${a[0]} (${a[1]})`)
    })
  }
  
  console.log('\n心情分布:')
  const moods = db.exec('SELECT mood, COUNT(*) as cnt FROM moments GROUP BY mood ORDER BY cnt DESC')
  if (moods.length > 0) {
    moods[0].values.forEach(m => {
      console.log(`  ${m[0]}: ${m[1]}条`)
    })
  }
  
  console.log('\n相册分类分布:')
  const categories = db.exec('SELECT category, COUNT(*) as cnt FROM albums GROUP BY category ORDER BY cnt DESC')
  if (categories.length > 0) {
    categories[0].values.forEach(c => {
      console.log(`  ${c[0]}: ${c[1]}个`)
    })
  }
}

checkData()
