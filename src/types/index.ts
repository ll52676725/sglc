export interface VideoQuality {
  name: string
  url: string
  resolution: number
}

export interface MediaItem {
  id: string
  type: 'photo' | 'video' | 'audio'
  filename: string
  url: string
  thumbnailUrl: string
  dateTaken: string
  location: string
  description: string
  people: string[]
  tags: string[]
  albumIds: string[]
  duration?: number
  width?: number
  height?: number
  hlsMasterUrl?: string
  videoQualities?: VideoQuality[]
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed'
  processingId?: string
  createdAt: string
  updatedAt: string
}

export interface MomentMedia {
  id: string
  type: 'photo' | 'video' | 'audio'
  filename: string
  url: string
  thumbnailUrl: string
  dateTaken?: string | null
  description?: string
  location?: string
  duration?: number
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed'
  processingId?: string
}

export interface Moment {
  id: string
  content: string
  mood: string
  weather: string
  location: string
  happenedAt: string
  tags: string[]
  media: MomentMedia[]
  createdAt: string
  updatedAt: string
}

export const MOOD_OPTIONS = [
  { value: 'happy', label: '开心', emoji: '😊' },
  { value: 'excited', label: '兴奋', emoji: '🤩' },
  { value: 'peaceful', label: '平静', emoji: '😌' },
  { value: 'grateful', label: '感恩', emoji: '🙏' },
  { value: 'love', label: '幸福', emoji: '🥰' },
  { value: 'nostalgic', label: '怀念', emoji: '🥹' },
  { value: 'sad', label: '难过', emoji: '😢' },
  { value: 'anxious', label: '焦虑', emoji: '😰' },
  { value: 'angry', label: '生气', emoji: '😤' },
  { value: 'tired', label: '疲惫', emoji: '😩' },
  { value: 'sick', label: '不适', emoji: '🤒' },
  { value: 'thinking', label: '沉思', emoji: '🤔' },
] as const

export const WEATHER_OPTIONS = [
  { value: 'sunny', label: '晴', emoji: '☀️' },
  { value: 'cloudy', label: '多云', emoji: '⛅' },
  { value: 'overcast', label: '阴', emoji: '☁️' },
  { value: 'rain', label: '雨', emoji: '🌧️' },
  { value: 'snow', label: '雪', emoji: '❄️' },
  { value: 'wind', label: '风', emoji: '💨' },
  { value: 'fog', label: '雾', emoji: '🌫️' },
  { value: 'storm', label: '雷暴', emoji: '⛈️' },
] as const

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

export type BiographyStyle = 'formal' | 'casual' | 'poetic' | 'modern' | 'wuxia' | 'romance' | 'fantasy' | 'memoir'

export interface WriterStyle {
  id: string
  name: string
  description: string
  category: string
}

export interface Biography {
  id: string
  title: string
  style: BiographyStyle
  language: 'zh' | 'en'
  writerId?: string | null
  chapters: BiographyChapter[]
  startDate: string
  endDate: string
  createdAt: string
  updatedAt: string
}

export interface BiographyChapter {
  title: string
  content: string
  mediaIds: string[]
  momentIds: string[]
  date: string
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
  modern: '现代文',
  wuxia: '武侠',
  romance: '都市爱情',
  fantasy: '奇幻',
  memoir: '回忆录',
}

export const STYLE_DESCRIPTIONS: Record<string, string> = {
  formal: '正式庄重的叙事风格',
  casual: '轻松愉快的日记风格',
  poetic: '优美诗意的文学风格',
  modern: '现代都市小说风格',
  wuxia: '江湖武侠传奇风格',
  romance: '浪漫爱情故事风格',
  fantasy: '奇幻冒险魔法风格',
  memoir: '深情回忆录风格',
}

export const STYLE_ICONS: Record<string, string> = {
  formal: '📜',
  casual: '📔',
  poetic: '🌸',
  modern: '🏙️',
  wuxia: '⚔️',
  romance: '💕',
  fantasy: '✨',
  memoir: '📖',
}

export interface AIGroupItem {
  name: string
  mediaIds: string[]
  count: number
  icon: string
}

export interface AIAutoAlbumSuggestion {
  type: 'people' | 'location' | 'event'
  name: string
  description: string
  icon: string
  mediaIds: string[]
  count: number
}

export interface AIInsight {
  type: string
  title: string
  description: string
  icon: string
}

export interface AIChapter {
  year: number
  title: string
  mediaCount: number
  highlights: string[]
  keyMoments: string[]
}

export interface AITimelineStory {
  timeSpan: {
    startDate: string
    endDate: string
    years: number
    months: number
  }
  summary: string
  chapters: AIChapter[]
}

export interface AIClassificationResult {
  totalMedia: number
  groups: {
    people: AIGroupItem[]
    locations: AIGroupItem[]
    tags: AIGroupItem[]
    events: AIGroupItem[]
    seasons: AIGroupItem[]
    timeOfDay: AIGroupItem[]
    months: AIGroupItem[]
    years: AIGroupItem[]
  }
  autoAlbumSuggestions: AIAutoAlbumSuggestion[]
  insights: AIInsight[]
  timelineStory: AITimelineStory | null
}
