import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  MapPin,
  Clock,
  Play,
  Trash2,
  Image,
  Video,
  Smile,
  CloudSun,
  Tag,
  MoreHorizontal,
  ChevronDown,
  CalendarDays,
  PenLine,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useStore } from '@/store/useStore'
import type { Moment, MomentMedia } from '@/types'
import { MOOD_OPTIONS, WEATHER_OPTIONS } from '@/types'
import { cn } from '@/lib/utils'
import ComposeMoment from './ComposeMoment'

function formatRelativeTime(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`
  return d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })
}

function formatFullDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getMoodEmoji(mood: string) {
  const found = MOOD_OPTIONS.find(m => m.value === mood)
  return found ? found.emoji : ''
}

function getWeatherEmoji(weather: string) {
  const found = WEATHER_OPTIONS.find(w => w.value === weather)
  return found ? found.emoji : ''
}

function MediaGrid({ media, onMediaClick }: { media: MomentMedia[]; onMediaClick: (m: MomentMedia) => void }) {
  if (media.length === 0) return null

  const count = media.length

  if (count === 1) {
    const m = media[0]
    const isVideo = m.type === 'video'
    return (
      <div
        className={cn(
          'mt-3 rounded-xl overflow-hidden cursor-pointer relative group',
          isVideo ? 'max-w-lg' : 'max-w-md'
        )}
        onClick={() => onMediaClick(m)}
      >
        {isVideo ? (
          <div className="relative aspect-video bg-black/5">
            {m.thumbnailUrl ? (
              <img src={m.thumbnailUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <video src={m.url} preload="metadata" className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center group-hover:bg-black/60 transition">
                <Play size={24} className="text-white ml-0.5" fill="white" />
              </div>
            </div>
          </div>
        ) : (
          <img src={m.url} alt="" className="w-full max-h-96 object-cover rounded-xl" />
        )}
      </div>
    )
  }

  const gridClass = count === 2
    ? 'grid-cols-2'
    : count === 3
    ? 'grid-cols-3'
    : count === 4
    ? 'grid-cols-2'
    : 'grid-cols-3'

  return (
    <div className={cn('mt-3 grid gap-1.5 rounded-xl overflow-hidden', gridClass)}>
      {media.slice(0, 9).map((m, i) => {
        const isVideo = m.type === 'video'
        const isLast = i === 8 && count > 9
        return (
          <div
            key={m.id}
            className={cn(
              'relative cursor-pointer group overflow-hidden',
              count === 3 && i === 0 ? 'row-span-2' : '',
              'aspect-square'
            )}
            onClick={() => onMediaClick(m)}
          >
            {isVideo && !m.thumbnailUrl ? (
              <video src={m.url} preload="metadata" muted className="w-full h-full object-cover" />
            ) : (
              <img src={m.thumbnailUrl || m.url} alt="" className="w-full h-full object-cover" />
            )}
            {isVideo && (
              <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <Play size={10} fill="white" /> 视频
              </div>
            )}
            {isLast && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white text-xl font-bold">+{count - 9}</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function MomentCard({ moment, onDelete }: { moment: Moment; onDelete: (id: string) => void }) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gold-200/40 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-white text-lg shadow-md shadow-gold-500/30">
            {moment.mood ? getMoodEmoji(moment.mood) : '✨'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-ink">我</span>
              {moment.mood && (
                <span className="text-xs bg-gold-100 text-gold-700 px-2 py-0.5 rounded-full">
                  {getMoodEmoji(moment.mood)} {MOOD_OPTIONS.find(m => m.value === moment.mood)?.label}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-ink/50 mt-0.5">
              <span>{formatRelativeTime(moment.happenedAt)}</span>
              {moment.location && (
                <span className="flex items-center gap-0.5">
                  <MapPin size={10} /> {moment.location}
                </span>
              )}
              {moment.weather && (
                <span className="flex items-center gap-0.5">
                  {getWeatherEmoji(moment.weather)} {WEATHER_OPTIONS.find(w => w.value === moment.weather)?.label}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-full hover:bg-gold-100 text-ink/30 hover:text-ink/60 transition"
          >
            <MoreHorizontal size={16} />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gold-200/60 py-1 z-20 min-w-[120px]">
                <button
                  onClick={() => { onDelete(moment.id); setShowMenu(false) }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition"
                >
                  <Trash2 size={14} /> 删除
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {moment.content && (
        <p className="mt-3 text-ink/85 leading-relaxed whitespace-pre-wrap text-[15px]">
          {moment.content}
        </p>
      )}

      <MediaGrid media={moment.media} onMediaClick={(m) => {}} />

      {moment.tags && moment.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {moment.tags.map(tag => (
            <span key={tag} className="text-xs text-gold-600 bg-gold-100/60 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Tag size={10} />{tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gold-100/60 flex items-center gap-4 text-xs text-ink/40">
        <span className="flex items-center gap-1" title={formatFullDate(moment.happenedAt)}>
          <Clock size={12} /> {formatFullDate(moment.happenedAt)}
        </span>
        {moment.media.length > 0 && (
          <span className="flex items-center gap-1">
            {moment.media.some(m => m.type === 'photo') && <><Image size={12} /> {moment.media.filter(m => m.type === 'photo').length} 张照片</>}
            {moment.media.some(m => m.type === 'video') && <><Video size={12} /> {moment.media.filter(m => m.type === 'video').length} 个视频</>}
          </span>
        )}
      </div>
    </div>
  )
}

interface DateDividerProps {
  date: string
  count: number
}

function DateDivider({ date, count }: DateDividerProps) {
  const d = new Date(date)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()

  let label = d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })
  if (isToday) label = '今天'
  if (isYesterday) label = '昨天'

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold-300/50 to-transparent" />
      <span className="text-sm text-ink/50 font-medium flex items-center gap-2 whitespace-nowrap">
        <CalendarDays size={14} className="text-gold-500" />
        {label}
        <span className="text-ink/30">· {count} 条动态</span>
      </span>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold-300/50 to-transparent" />
    </div>
  )
}

export default function Timeline() {
  const navigate = useNavigate()
  const { moments, setMoments, addMoment, removeMoment } = useStore()
  const [loading, setLoading] = useState(true)
  const [showCompose, setShowCompose] = useState(false)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const PAGE_SIZE = 20

  useEffect(() => {
    setLoading(true)
    api.moments.list({ page: '1', limit: String(PAGE_SIZE) })
      .then((data) => {
        setMoments(data.items || [])
        setTotal(data.total || 0)
      })
      .finally(() => setLoading(false))
  }, [setMoments])

  const years = useMemo(() => {
    const yearSet = new Set<number>()
    moments.forEach((m) => {
      if (m.happenedAt) {
        yearSet.add(new Date(m.happenedAt).getFullYear())
      }
    })
    return Array.from(yearSet).sort((a, b) => b - a)
  }, [moments])

  const filteredMoments = useMemo(() => {
    if (!selectedYear) return moments
    return moments.filter((m) => {
      if (!m.happenedAt) return false
      return new Date(m.happenedAt).getFullYear() === selectedYear
    })
  }, [moments, selectedYear])

  const groupedByDate = useMemo(() => {
    const dateMap = new Map<string, Moment[]>()

    filteredMoments.forEach((moment) => {
      const d = new Date(moment.happenedAt)
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, [])
      }
      dateMap.get(dateKey)!.push(moment)
    })

    return Array.from(dateMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dateKey, items]) => ({ dateKey, items }))
  }, [filteredMoments])

  const handleLoadMore = async () => {
    const nextPage = page + 1
    try {
      const data = await api.moments.list({ page: String(nextPage), limit: String(PAGE_SIZE) })
      setMoments([...moments, ...(data.items || [])])
      setTotal(data.total || 0)
      setPage(nextPage)
    } catch {}
  }

  const handleDelete = async (id: string) => {
    try {
      await api.moments.delete(id)
      removeMoment(id)
    } catch {}
  }

  const handleComposeSuccess = (moment: Moment) => {
    addMoment(moment)
    setShowCompose(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen fade-in max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl golden-underline inline-block">时光动态</h1>
        <button
          onClick={() => setShowCompose(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 text-white rounded-xl shadow-md shadow-gold-500/30 hover:shadow-lg hover:shadow-gold-500/40 transition-all active:scale-95"
        >
          <Plus size={18} />
          记录此刻
        </button>
      </div>

      {years.length > 0 && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedYear(null)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              selectedYear === null ? 'bg-gold-500 text-white' : 'bg-white/60 text-ink/60 hover:bg-white/80'
            )}
          >
            全部
          </button>
          {years.map((year) => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                selectedYear === year ? 'bg-gold-500 text-white' : 'bg-white/60 text-ink/60 hover:bg-white/80'
              )}
            >
              {year}
            </button>
          ))}
        </div>
      )}

      {filteredMoments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-ink/60">
          <PenLine size={64} className="mb-4 text-gold-500/50" />
          <p className="text-lg mb-2">还没有记录</p>
          <p className="text-sm mb-6 text-ink/40">记录你的心情、故事和日常，为未来的传记留下素材</p>
          <button
            onClick={() => setShowCompose(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            <Plus size={18} />
            写下第一条动态
          </button>
        </div>
      ) : (
        <>
          <div className="relative pl-6">
            <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gold-500/40 via-gold-400/20 to-transparent" />

            {groupedByDate.map(({ dateKey, items }) => (
              <div key={dateKey} className="mb-6">
                <DateDivider date={dateKey} count={items.length} />
                <div className="space-y-4 mt-4">
                  {items.map((moment) => (
                    <div key={moment.id} className="relative">
                      <div className="absolute -left-6 top-6 w-3 h-3 rounded-full bg-gold-500 shadow-md shadow-gold-500/40 border-2 border-white" />
                      <MomentCard moment={moment} onDelete={handleDelete} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {moments.length < total && (
            <div className="text-center mt-8">
              <button
                onClick={handleLoadMore}
                className="px-6 py-2.5 bg-white/60 border border-gold-300 rounded-xl text-ink/70 hover:bg-white/80 transition-colors"
              >
                加载更多
              </button>
            </div>
          )}
        </>
      )}

      {showCompose && (
        <ComposeMoment
          onClose={() => setShowCompose(false)}
          onSuccess={handleComposeSuccess}
        />
      )}
    </div>
  )
}
