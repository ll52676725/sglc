import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Image, Video, FolderOpen, CalendarRange, Camera, Clock, Play } from 'lucide-react'
import { api } from '@/lib/api'
import { useStore } from '@/store/useStore'
import type { MediaItem, Stats } from '@/types'
import { cn } from '@/lib/utils'

function formatDate(dateStr: string | null) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatDateKey(dateStr: string | null) {
  if (!dateStr) return 'unknown'
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatMonthYear(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
}

function MediaCard({ item, onClick }: { item: MediaItem; onClick: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoError, setVideoError] = useState(false)

  const hasVideoThumbnail = item.type === 'video' && item.thumbnailUrl

  return (
    <div className="masonry-item">
      <div
        onClick={onClick}
        className="photo-card rounded-xl overflow-hidden bg-white/80 shadow-md cursor-pointer group relative"
      >
        <div className={cn('overflow-hidden', item.type === 'video' ? 'aspect-video' : 'aspect-[4/3]')}>
          {item.type === 'video' && !hasVideoThumbnail && !videoError ? (
            <video
              ref={videoRef}
              src={item.url}
              preload="metadata"
              muted
              playsInline
              className="w-full h-full object-cover"
              onError={() => setVideoError(true)}
            />
          ) : (
            <img
              src={item.thumbnailUrl || item.url}
              alt={item.description || item.filename}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}
        </div>
        {item.type === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-10 h-10 rounded-full bg-ink/40 flex items-center justify-center group-hover:bg-ink/60 transition">
              <Play size={20} className="text-white ml-0.5" fill="white" />
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
          {item.dateTaken && (
            <p className="text-white/90 text-sm">{formatDate(item.dateTaken)}</p>
          )}
          {item.description && (
            <p className="text-white text-sm mt-1 line-clamp-2">{item.description}</p>
          )}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {item.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="bg-gold-500/20 text-gold-200 text-xs px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface DateGroup {
  dateKey: string
  dateLabel: string
  items: MediaItem[]
}

interface MonthGroup {
  monthKey: string
  monthLabel: string
  dateGroups: DateGroup[]
}

export default function Timeline() {
  const navigate = useNavigate()
  const { media, setMedia, addMedia } = useStore()
  const [stats, setStats] = useState<Stats | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const PAGE_SIZE = 20

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.media.list({ page: '1', limit: String(PAGE_SIZE) }),
      api.stats.get(),
    ])
      .then(([mediaData, statsData]) => {
        setMedia(mediaData.items || [])
        setTotal(mediaData.total || 0)
        setStats(statsData)
      })
      .finally(() => setLoading(false))
  }, [setMedia])

  const years = useMemo(() => {
    const yearSet = new Set<number>()
    media.forEach((m) => {
      if (m.dateTaken) {
        yearSet.add(new Date(m.dateTaken).getFullYear())
      }
    })
    return Array.from(yearSet).sort((a, b) => b - a)
  }, [media])

  const filteredMedia = useMemo(() => {
    if (!selectedYear) return media
    return media.filter((m) => {
      if (!m.dateTaken) return false
      return new Date(m.dateTaken).getFullYear() === selectedYear
    })
  }, [media, selectedYear])

  const groupedByMonth = useMemo(() => {
    const monthMap = new Map<string, Map<string, MediaItem[]>>()
    const unknownItems: MediaItem[] = []

    filteredMedia.forEach((item) => {
      if (!item.dateTaken) {
        unknownItems.push(item)
        return
      }
      const d = new Date(item.dateTaken)
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const dateKey = formatDateKey(item.dateTaken)
      
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, new Map())
      }
      const dateMap = monthMap.get(monthKey)!
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, [])
      }
      dateMap.get(dateKey)!.push(item)
    })

    const monthGroups: MonthGroup[] = Array.from(monthMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([monthKey, dateMap]) => {
        const firstDate = dateMap.keys().next().value
        const dateGroups: DateGroup[] = Array.from(dateMap.entries())
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([dateKey, items]) => ({
            dateKey,
            dateLabel: formatDate(dateKey),
            items,
          }))
        return {
          monthKey,
          monthLabel: formatMonthYear(firstDate),
          dateGroups,
        }
      })

    if (unknownItems.length > 0) {
      monthGroups.push({
        monthKey: 'unknown',
        monthLabel: '未设置日期',
        dateGroups: [{
          dateKey: 'unknown',
          dateLabel: '未设置日期',
          items: unknownItems,
        }],
      })
    }

    return monthGroups
  }, [filteredMedia])

  const handleLoadMore = async () => {
    const nextPage = page + 1
    try {
      const data = await api.media.list({ page: String(nextPage), limit: String(PAGE_SIZE) })
      addMedia(data.items || [])
      setTotal(data.total || 0)
      setPage(nextPage)
    } catch {}
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen fade-in">
      <h1 className="font-display text-3xl text-ink golden-underline inline-block mb-8">时光线</h1>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/60 backdrop-blur rounded-xl p-4 border border-gold-500/30 flex items-center gap-3">
            <Image className="w-8 h-8 text-gold-500" />
            <div>
              <p className="text-2xl font-bold text-ink">{stats.totalPhotos}</p>
              <p className="text-xs text-ink/60">照片</p>
            </div>
          </div>
          <div className="bg-white/60 backdrop-blur rounded-xl p-4 border border-gold-500/30 flex items-center gap-3">
            <Video className="w-8 h-8 text-gold-500" />
            <div>
              <p className="text-2xl font-bold text-ink">{stats.totalVideos}</p>
              <p className="text-xs text-ink/60">视频</p>
            </div>
          </div>
          <div className="bg-white/60 backdrop-blur rounded-xl p-4 border border-gold-500/30 flex items-center gap-3">
            <FolderOpen className="w-8 h-8 text-gold-500" />
            <div>
              <p className="text-2xl font-bold text-ink">{stats.totalAlbums}</p>
              <p className="text-xs text-ink/60">相册</p>
            </div>
          </div>
          <div className="bg-white/60 backdrop-blur rounded-xl p-4 border border-gold-500/30 flex items-center gap-3">
            <CalendarRange className="w-8 h-8 text-gold-500" />
            <div>
              <p className="text-2xl font-bold text-ink">{stats.yearSpan}</p>
              <p className="text-xs text-ink/60">年跨度</p>
            </div>
          </div>
        </div>
      )}

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

      {filteredMedia.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-ink/60">
          <Camera size={64} className="mb-4 text-gold-500/50" />
          <p className="text-lg mb-2">还没有记忆</p>
          <button
            onClick={() => navigate('/upload')}
            className="text-gold-500 hover:text-gold-600 underline transition-colors"
          >
            去上传第一张照片吧
          </button>
        </div>
      ) : (
        <>
          <div className="relative pl-8">
            <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gold-500/50 via-gold-400/30 to-transparent" />
            
            {groupedByMonth.map((monthGroup) => (
              <div key={monthGroup.monthKey} className="mb-12">
                <div className="flex items-center gap-3 mb-6 sticky top-0 bg-gradient-to-r from-ivory via-ivory/95 to-transparent py-3 z-10 -ml-8 pl-8">
                  <div className="w-4 h-4 rounded-full bg-gold-500 shadow-lg shadow-gold-500/50 -ml-8" />
                  <h2 className="font-display text-2xl text-ink">
                    {monthGroup.monthLabel}
                  </h2>
                  <span className="text-ink/40 text-sm ml-2">
                    {monthGroup.dateGroups.reduce((sum, dg) => sum + dg.items.length, 0)} 项记忆
                  </span>
                </div>

                {monthGroup.dateGroups.map((dateGroup) => (
                  <div key={dateGroup.dateKey} className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-2.5 h-2.5 rounded-full bg-gold-400 -ml-[11px]" />
                      <Clock size={14} className="text-gold-500" />
                      <h3 className="text-ink/70 font-medium">
                        {dateGroup.dateLabel}
                      </h3>
                      <span className="text-ink/40 text-xs">
                        {dateGroup.items.length} 张
                      </span>
                    </div>

                    <div className="masonry">
                      {dateGroup.items.map((item) => (
                        <MediaCard
                          key={item.id}
                          item={item}
                          onClick={() => navigate(`/media/${item.id}`)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {media.length < total && (
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
    </div>
  )
}
