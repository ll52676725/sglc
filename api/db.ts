import initSqlJs, { type Database } from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DB_PATH = path.resolve(__dirname, '..', 'data', 'memory.db')

let db: Database | null = null

const SCHEMA = `
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  date_taken TEXT,
  location TEXT DEFAULT '',
  description TEXT DEFAULT '',
  duration REAL DEFAULT 0,
  width INTEGER DEFAULT 0,
  height INTEGER DEFAULT 0,
  hls_master_url TEXT DEFAULT '',
  video_qualities TEXT DEFAULT '[]',
  processing_status TEXT DEFAULT 'completed',
  processing_id TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS albums (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('holiday', 'travel', 'daily', 'milestone', 'other')),
  description TEXT DEFAULT '',
  cover_media_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS media_albums (
  media_id TEXT NOT NULL,
  album_id TEXT NOT NULL,
  PRIMARY KEY (media_id, album_id)
);

CREATE TABLE IF NOT EXISTS media_people (
  id TEXT PRIMARY KEY,
  media_id TEXT NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS media_tags (
  id TEXT PRIMARY KEY,
  media_id TEXT NOT NULL,
  tag TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS biographies (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  style TEXT NOT NULL,
  language TEXT NOT NULL CHECK(language IN ('zh', 'en')),
  start_date TEXT,
  end_date TEXT,
  content TEXT NOT NULL,
  writer_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS moments (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL DEFAULT '',
  mood TEXT DEFAULT '',
  weather TEXT DEFAULT '',
  location TEXT DEFAULT '',
  happened_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS moment_media (
  moment_id TEXT NOT NULL,
  media_id TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  PRIMARY KEY (moment_id, media_id)
);

CREATE TABLE IF NOT EXISTS moment_tags (
  id TEXT PRIMARY KEY,
  moment_id TEXT NOT NULL,
  tag TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_moments_happened_at ON moments(happened_at);
CREATE INDEX IF NOT EXISTS idx_moment_tags_tag ON moment_tags(tag);
CREATE INDEX IF NOT EXISTS idx_media_date_taken ON media(date_taken);
CREATE INDEX IF NOT EXISTS idx_media_type ON media(type);
CREATE INDEX IF NOT EXISTS idx_media_albums_album ON media_albums(album_id);
CREATE INDEX IF NOT EXISTS idx_media_tags_tag ON media_tags(tag);
`

function ensureDataDir() {
  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export function saveDb() {
  if (!db) return
  ensureDataDir()
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(DB_PATH, buffer)
}

async function runMigrations(database: Database) {
  try {
    const bioColumns = all(database, `PRAGMA table_info(biographies)`)
    const hasWriterId = bioColumns.some((col: any) => col.name === 'writer_id')
    if (!hasWriterId) {
      run(database, `ALTER TABLE biographies ADD COLUMN writer_id TEXT`)
    }

    const mediaColumns = all(database, `PRAGMA table_info(media)`)
    const mediaColumnNames = mediaColumns.map((col: any) => col.name)
    
    const newColumns = [
      { name: 'duration', type: 'REAL DEFAULT 0' },
      { name: 'width', type: 'INTEGER DEFAULT 0' },
      { name: 'height', type: 'INTEGER DEFAULT 0' },
      { name: 'hls_master_url', type: "TEXT DEFAULT ''" },
      { name: 'video_qualities', type: "TEXT DEFAULT '[]'" },
      { name: 'processing_status', type: "TEXT DEFAULT 'completed'" },
      { name: 'processing_id', type: "TEXT DEFAULT ''" },
    ]

    for (const col of newColumns) {
      if (!mediaColumnNames.includes(col.name)) {
        run(database, `ALTER TABLE media ADD COLUMN ${col.name} ${col.type}`)
      }
    }

    const checkConstraint = mediaColumns.find((col: any) => col.name === 'type')
    if (checkConstraint) {
      const typeCheck = String(checkConstraint.type || '')
      if (typeCheck.includes("CHECK") && !typeCheck.includes("audio")) {
        try {
          run(database, `
            CREATE TABLE IF NOT EXISTS media_new (
              id TEXT PRIMARY KEY,
              type TEXT NOT NULL,
              filename TEXT NOT NULL,
              url TEXT NOT NULL,
              thumbnail_url TEXT NOT NULL,
              date_taken TEXT,
              location TEXT DEFAULT '',
              description TEXT DEFAULT '',
              duration REAL DEFAULT 0,
              width INTEGER DEFAULT 0,
              height INTEGER DEFAULT 0,
              hls_master_url TEXT DEFAULT '',
              video_qualities TEXT DEFAULT '[]',
              processing_status TEXT DEFAULT 'completed',
              processing_id TEXT DEFAULT '',
              created_at TEXT DEFAULT (datetime('now')),
              updated_at TEXT DEFAULT (datetime('now'))
            );
          `)
          run(database, `INSERT INTO media_new SELECT * FROM media`)
          run(database, `DROP TABLE media`)
          run(database, `ALTER TABLE media_new RENAME TO media`)
        } catch (e) {
          console.log('Skip type constraint migration:', e)
        }
      }
    }
  } catch (e) {
    console.error('Migration failed:', e)
  }
}

export async function getDb(): Promise<Database> {
  if (db) return db

  const SQL = await initSqlJs()

  ensureDataDir()

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(fileBuffer)
    await runMigrations(db)
  } else {
    db = new SQL.Database()
    db.run(SCHEMA)
    saveDb()
  }

  return db
}

export function all<T = Record<string, unknown>>(db: Database, sql: string, params: unknown[] = []): T[] {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const rows: T[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T)
  }
  stmt.free()
  return rows
}

export function get<T = Record<string, unknown>>(db: Database, sql: string, params: unknown[] = []): T | undefined {
  const rows = all<T>(db, sql, params)
  return rows[0]
}

export function run(db: Database, sql: string, params: unknown[] = []): void {
  db.run(sql, params)
  saveDb()
}
