import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  MapPin,
  Clock,
  Play,
  Trash2,
  Image,
  Video,
  Mic,
  Smile,
  CloudSun,
  Tag,
  MoreHorizontal,
  ChevronDown,
  CalendarDays,
  PenLine,
  Loader2,
  AlertCircle,
  Camera,
  Upload,
  MessageSquare,
  ArrowRight,
  Sparkles,
  FolderTree,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useStore } from '@/store/useStore'
import type { Moment, MomentMedia } from '@/types'
import { MOOD_OPTIONS, WEATHER_OPTIONS } from '@/types'
import { cn } from '@/lib/utils'
import ComposeMoment from './ComposeMoment'
import AudioPlayer from '@/components/AudioPlayer'
import UploadModal from './UploadModal'

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

function ProcessingOverlay({ status, type = 'video' }: { status: 'processing' | 'failed' | 'pending'; type?: 'video' | 'audio' }) {
  const typeLabel = type === 'audio' ? '语音' : '视频'
  if (status === 'failed') {
    return (
      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10">
        <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
        <p className="text-white text-sm">{typeLabel}处理失败</p>
      </div>
    )
  }
  return (
    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10">
      <Loader2 className="w-8 h-8 text-gold-400 animate-spin mb-2" />
      <p className="text-white text-sm">{typeLabel}处理中...</p>
      <p className="text-white/60 text-xs mt-1">请稍候，处理完成后自动显示</p>
    </div>
  )
}

function MediaItem({ m, onMediaClick, single }: { m: MomentMedia; onMediaClick: (m: MomentMedia) => void; single?: boolean }) {
  const isVideo = m.type === 'video'
  const isAudio = m.type === 'audio'
  const isProcessing = (isVideo || isAudio) && m.processingStatus === 'processing'
  const isFailed = (isVideo || isAudio) && m.processingStatus === 'failed'
  const showOverlay = isProcessing || isFailed

  if (single) {
    if (isAudio) {
      return (
        <div className="mt-3">
          {showOverlay ? (
            <div className="relative rounded-xl overflow-hidden aspect-[2/1] bg-gold-100">
              <div className="absolute inset-0 flex items-center justify-center">
                <Mic className="w-12 h-12 text-gold-300" />
              </div>
              <ProcessingOverlay status={m.processingStatus as any} type="audio" />
            </div>
          ) : (
            <AudioPlayer src={m.url} duration={m.duration} />
          )}
        </div>
      )
    }

    return (
      <div
        className={cn(
          'mt-3 rounded-xl overflow-hidden cursor-pointer relative group',
          isVideo ? 'max-w-lg' : 'max-w-md'
        )}
        onClick={() => !showOverlay && onMediaClick(m)}
      >
        {isVideo ? (
          <div className="relative aspect-video bg-black/5">
            {m.thumbnailUrl ? (
              <img src={m.thumbnailUrl} alt="" className={cn('w-full h-full object-cover', showOverlay && 'blur-sm')} />
            ) : (
              <div className="w-full h-full bg-gold-100 flex items-center justify-center">
                <Video className="w-12 h-12 text-gold-300" />
              </div>
            )}
            {!showOverlay && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center group-hover:bg-black/60 transition">
                  <Play size={24} className="text-white ml-0.5" fill="white" />
                </div>
              </div>
            )}
            {showOverlay && <ProcessingOverlay status={m.processingStatus as any} type="video" />}
          </div>
        ) : (
          <img src={m.url} alt="" className="w-full max-h-96 object-cover rounded-xl" />
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative cursor-pointer group overflow-hidden aspect-square',
      )}
      onClick={() => !showOverlay && !isAudio && onMediaClick(m)}
    >
      {isAudio ? (
        <div className={cn('w-full h-full bg-gradient-to-br from-gold-100 to-gold-200/50 flex flex-col items-center justify-center p-2', showOverlay && 'blur-sm')}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-gold-500 to-gold-600 flex items-center justify-center mb-1 shadow-md">
            <Play size={18} className="text-white ml-0.5" fill="white" />
          </div>
          <div className="flex items-center gap-1 text-[10px] text-gold-700">
            <Mic size={10} />
            <span>
              {m.duration
                ? `${Math.floor(m.duration / 60)}:${Math.floor(m.duration % 60).toString().padStart(2, '0')}`
                : '语音'
              }
            </span>
          </div>
          <div className="absolute top-2 left-2 bg-gold-600/80 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 z-20">
            <Mic size={10} /> 语音
          </div>
        </div>
      ) : isVideo && !m.thumbnailUrl ? (
        <div className={cn('w-full h-full bg-gold-100 flex items-center justify-center', showOverlay && 'blur-sm')}>
          <Video className="w-8 h-8 text-gold-300" />
        </div>
      ) : (
        <img src={m.thumbnailUrl || m.url} alt="" className={cn('w-full h-full object-cover', showOverlay && 'blur-sm')} />
      )}
      {isVideo && (
        <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1 z-20">
          <Play size={10} fill="white" /> 视频
        </div>
      )}
      {showOverlay && <ProcessingOverlay status={m.processingStatus as any} type={isAudio ? 'audio' : 'video'} />}
    </div>
  )
}

function MediaGrid({ media, onMediaClick, onUpdate }: { 
  media: MomentMedia[]; 
  onMediaClick: (m: MomentMedia) => void;
  onUpdate?: (id: string, data: Partial<MomentMedia>) => void;
}) {
  const [localMedia, setLocalMedia] = useState(media)

  useEffect(() => {
    setLocalMedia(media)
  }, [media])

  const checkProcessingStatus = useCallback(async () => {
    const processingItems = localMedia.filter(m => (m.type === 'video' || m.type === 'audio') && m.processingStatus === 'processing' && m.processingId)
    
    for (const m of processingItems) {
      try {
        const status = await api.media.getProcessingStatus(m.processingId!)
        if (status?.status === 'completed' || status?.status === 'failed') {
          setLocalMedia(prev => prev.map(item => {
            if (item.id === m.id) {
              const updated = {
                ...item,
                processingStatus: status.status,
                thumbnailUrl: status.result?.thumbnailUrl || item.thumbnailUrl,
                duration: status.result?.duration || item.duration,
              }
              onUpdate?.(m.id, updated)
              return updated
            }
            return item
          }))
        }
      } catch (e) {
        // 静默失败，下次重试
      }
    }
  }, [localMedia, onUpdate])

  useEffect(() => {
    const hasProcessing = localMedia.some(m => (m.type === 'video' || m.type === 'audio') && m.processingStatus === 'processing')
    if (!hasProcessing) return

    checkProcessingStatus()
    const interval = setInterval(checkProcessingStatus, 3000)
    return () => clearInterval(interval)
  }, [localMedia, checkProcessingStatus])

  if (localMedia.length === 0) return null

  const count = localMedia.length

  if (count === 1) {
    return <MediaItem m={localMedia[0]} onMediaClick={onMediaClick} single />
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
      {localMedia.slice(0, 9).map((m, i) => {
        const isLast = i === 8 && count > 9
        return (
          <div key={m.id} className={cn(count === 3 && i === 0 ? 'row-span-2' : '')}>
            <MediaItem m={m} onMediaClick={onMediaClick} />
            {isLast && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                <span className="text-white text-xl font-bold">+{count - 9}</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function MomentCard({ moment, onDelete, onUpdateMedia }: { 
  moment: Moment; 
  onDelete: (id: string) => void;
  onUpdateMedia?: (momentId: string, mediaId: string, data: Partial<MomentMedia>) => void;
}) {
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

      <MediaGrid 
        media={moment.media} 
        onMediaClick={(m) => {}} 
        onUpdate={(mediaId, data) => onUpdateMedia?.(moment.id, mediaId, data)}
      />

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
            {moment.media.some(m => m.type === 'audio') && <><Mic size={12} /> {moment.media.filter(m => m.type === 'audio').length} 条语音</>}
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

function QuickActionCard({ 
  icon: Icon, 
  title, 
  description, 
  color, 
  onClick,
  iconBg 
}: { 
  icon: any
  title: string
  description: string
  color: string
  onClick: () => void
  iconBg: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
        "bg-gradient-to-br border border-gold-200/50",
        color
      )}
    >
      <div className={cn(
        "w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110",
        iconBg
      )}>
        <Icon className="w-7 h-7 text-white" />
      </div>
      <h3 className="font-display text-xl text-ink mb-1">{title}</h3>
      <p className="text-sm text-ink/60">{description}</p>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowRight className="w-5 h-5 text-ink/30" />
      </div>
    </button>
  )
}

export default function MemoryCollection() {
  const navigate = useNavigate()
  const { moments, setMoments, addMoment, removeMoment, updateMomentItem, media, albums } = useStore()
  const [loading, setLoading] = useState(true)
  const [showCompose, setShowCompose] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<{ photos: number; moments: number; albums: number } | null>(null)
  const PAGE_SIZE = 20

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.moments.list({ page: '1', limit: String(PAGE_SIZE) }),
      api.stats.get(),
    ])
      .then(([momentsData, statsData]) => {
        setMoments(momentsData.items || [])
        setTotal(momentsData.total || 0)
        if (statsData) {
          setStats({
            photos: (statsData.totalPhotos || 0) + (statsData.totalVideos || 0),
            moments: momentsData.total || 0,
            albums: statsData.totalAlbums || 0,
          })
        }
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

  const handleUpdateMedia = (momentId: string, mediaId: string, data: Partial<MomentMedia>) => {
    const moment = moments.find(m => m.id === momentId)
    if (moment) {
      updateMomentItem(momentId, {
        ...moment,
        media: moment.media.map(m => m.id === mediaId ? { ...m, ...data } : m)
      })
    }
  }

  const handleComposeSuccess = (moment: Moment) => {
    addMoment(moment)
    setShowCompose(false)
    if (stats) {
      setStats(prev => prev ? { ...prev, moments: prev.moments + 1 } : null)
    }
  }

  const handleUploadSuccess = () => {
    setShowUpload(false)
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
      <div className="mb-8">
        <h1 className="font-display text-3xl golden-underline inline-block mb-2">📸 记忆收集</h1>
        <p className="text-ink/60">记录生活中的每一个珍贵时刻</p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-gold-50 to-white rounded-xl p-5 border border-gold-200/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-ink/50 mb-1">照片视频</p>
                <p className="text-3xl font-display text-ink">{stats.photos}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Image className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-gold-50 to-white rounded-xl p-5 border border-gold-200/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-ink/50 mb-1">时光动态</p>
                <p className="text-3xl font-display text-ink">{stats.moments}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center">
                <PenLine className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-gold-50 to-white rounded-xl p-5 border border-gold-200/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-ink/50 mb-1">相册数量</p>
                <p className="text-3xl font-display text-ink">{stats.albums}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                <FolderTree className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div id="quick-actions" className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <QuickActionCard
          icon={PenLine}
          title="发布动态"
          description="记录此刻的心情与故事"
          color="from-rose-50 to-pink-50"
          iconBg="bg-gradient-to-br from-rose-500 to-pink-600"
          onClick={() => setShowCompose(true)}
        />
        <QuickActionCard
          icon={Upload}
          title="上传媒体"
          description="批量上传照片和视频"
          color="from-blue-50 to-sky-50"
          iconBg="bg-gradient-to-br from-blue-500 to-sky-600"
          onClick={() => setShowUpload(true)}
        />
        <QuickActionCard
          icon={Sparkles}
          title="智能整理"
          description="AI分类整理你的记忆"
          color="from-purple-50 to-violet-50"
          iconBg="bg-gradient-to-br from-purple-500 to-violet-600"
          onClick={() => navigate('/organize')}
        />
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-xl text-ink">⏱️ 最近动态</h2>
        {years.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
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
      </div>

      {filteredMoments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-ink/60 bg-gradient-to-br from-gold-50/50 to-white/50 rounded-2xl border border-gold-200/30">
          <div className="w-20 h-20 rounded-full bg-gold-100 flex items-center justify-center mb-6">
            <PenLine size={40} className="text-gold-400" />
          </div>
          <p className="text-xl font-medium mb-2">还没有记录</p>
          <p className="text-sm mb-8 text-ink/40 max-w-md text-center">
            每一个平凡的日子，都值得被记住。<br />
            发布你的第一条动态，开启时光簿之旅
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCompose(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              <Plus size={18} />
              写下第一条动态
            </button>
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-gold-300 text-ink/70 rounded-xl hover:bg-gold-50 transition-all"
            >
              <Upload size={18} />
              上传照片
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative pl-6 max-w-3xl mx-auto">
            <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gold-500/40 via-gold-400/20 to-transparent" />

            {groupedByDate.map(({ dateKey, items }) => (
              <div key={dateKey} className="mb-6">
                <DateDivider date={dateKey} count={items.length} />
                <div className="space-y-4 mt-4">
                  {items.map((moment) => (
                    <div key={moment.id} className="relative">
                      <div className="absolute -left-6 top-6 w-3 h-3 rounded-full bg-gold-500 shadow-md shadow-gold-500/40 border-2 border-white" />
                      <MomentCard moment={moment} onDelete={handleDelete} onUpdateMedia={handleUpdateMedia} />
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

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  )
}
