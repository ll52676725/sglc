import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Image, Video, FolderOpen, CalendarRange, Camera } from 'lucide-react'
import { api } from '@/lib/api'
import { useStore } from '@/store/useStore'
import type { MediaItem, Stats } from '@/types'
import { cn } from '@/lib/utils'

function formatDate(dateStr: string | null) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

function MediaCard({ item, onClick }: { item: MediaItem; onClick: () => void }) {
  return (
    <div className="masonry-item">
      <div
        onClick={onClick}
        className="photo-card rounded-xl overflow-hidden bg-white/80 shadow-md cursor-pointer group relative"
      >
        <div className={cn('overflow-hidden', item.type === 'video' ? 'aspect-video' : 'aspect-[4/3]')}>
          <img
            src={item.thumbnailUrl || item.url}
            alt={item.description || item.filename}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
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
          <div className="masonry">
            {filteredMedia.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                onClick={() => navigate(`/media/${item.id}`)}
              />
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
