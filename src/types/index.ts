export interface MediaItem {
  id: string
  type: 'photo' | 'video'
  filename: string
  url: string
  thumbnailUrl: string
  dateTaken: string
  location: string
  description: string
  people: string[]
  tags: string[]
  albumIds: string[]
  createdAt: string
  updatedAt: string
}

export interface Album {
  id: string
  name: string
  category: 'holiday' | 'travel' | 'daily' | 'milestone' | 'other'
  description: string
  coverMediaId: string | null
  mediaCount: number
  earliestDate: string | null
  latestDate: string | null
  createdAt: string
  updatedAt: string
}

export interface Biography {
  id: string
  title: string
  style: 'formal' | 'casual' | 'poetic'
  language: 'zh' | 'en'
  chapters: BiographyChapter[]
  startYear: number
  endYear: number
  createdAt: string
  updatedAt: string
}

export interface BiographyChapter {
  title: string
  content: string
  mediaIds: string[]
  year: number
}

export interface Stats {
  totalPhotos: number
  totalVideos: number
  totalAlbums: number
  yearSpan: number
  earliestDate: string
  latestDate: string
  tagCloud: { tag: string; count: number }[]
}

export const CATEGORY_LABELS: Record<string, string> = {
  holiday: '节假日',
  travel: '旅行',
  daily: '日常',
  milestone: '里程碑',
  other: '其他',
}

export const STYLE_LABELS: Record<string, string> = {
  formal: '正式',
  casual: '轻松',
  poetic: '诗意',
}
