import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Sparkles,
  Users,
  MapPin,
  Tag,
  Calendar,
  Clock,
  Sun,
  FolderPlus,
  Check,
  RefreshCw,
  Zap,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useStore } from '@/store/useStore'
import type { AIClassificationResult, AIGroupItem, AIAutoAlbumSuggestion } from '@/types'
import { cn } from '@/lib/utils'

type GroupType = 'people' | 'locations' | 'events' | 'tags' | 'seasons' | 'timeOfDay' | 'months' | 'years'

const GROUP_CONFIG: Record<GroupType, { label: string; icon: any; color: string }> = {
  people: { label: '人物', icon: Users, color: 'from-blue-500 to-cyan-500' },
  locations: { label: '地点', icon: MapPin, color: 'from-green-500 to-emerald-500' },
  events: { label: '事件', icon: Calendar, color: 'from-purple-500 to-pink-500' },
  tags: { label: '标签', icon: Tag, color: 'from-orange-500 to-amber-500' },
  seasons: { label: '季节', icon: Sun, color: 'from-teal-500 to-cyan-500' },
  timeOfDay: { label: '时段', icon: Clock, color: 'from-indigo-500 to-purple-500' },
  months: { label: '月份', icon: Calendar, color: 'from-rose-500 to-pink-500' },
  years: { label: '年份', icon: Calendar, color: 'from-amber-500 to-orange-500' },
}

export default function AIClassify() {
  const navigate = useNavigate()
  const { media, setMedia, setAlbums, addAlbum } = useStore()
  const [data, setData] = useState<AIClassificationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeGroup, setActiveGroup] = useState<GroupType>('people')
  const [expandedStory, setExpandedStory] = useState(true)
  const [creatingAlbum, setCreatingAlbum] = useState<string | null>(null)
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('all')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [showInfo, setShowInfo] = useState(false)

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const refreshMedia = useCallback(async () => {
    try {
      const result = await api.media.list({ limit: '500' })
      setMedia(result.items || [])
      return result.items || []
    } catch (err) {
      console.error('Failed to refresh media:', err)
      return media
    }
  }, [media, setMedia])

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      await refreshMedia()
      const result = await api.ai.classify(selectedAlbumId === 'all' ? undefined : selectedAlbumId)
      
      setData(prev => {
        if (isRefresh && prev) {
          const prevStr = JSON.stringify(prev)
          const newStr = JSON.stringify(result)
          if (prevStr === newStr) {
            showToast('分析完成！没有检测到新的元数据变化。建议为照片添加更多标签、人物或地点信息。', 'info')
          } else {
            showToast('分析完成！发现新的分类结果。', 'success')
          }
        }
        return result
      })
    } catch (err) {
      console.error('AI classification failed:', err)
      showToast('分析失败，请稍后重试。', 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedAlbumId, refreshMedia, showToast])

  useEffect(() => {
    loadData()
  }, [selectedAlbumId])

  useEffect(() => {
    api.albums.list().then(setAlbums)
  }, [setAlbums])

  const { albums } = useStore()

  const currentGroup = useMemo(() => {
    if (!data) return []
    return data.groups[activeGroup] || []
  }, [data, activeGroup])

  const handleCreateAlbum = async (suggestion: AIAutoAlbumSuggestion) => {
    setCreatingAlbum(suggestion.name)
    try {
      const categoryMap: Record<string, any> = {
        people: 'milestone',
        location: 'travel',
        event: 'holiday',
      }
      const newAlbum = await api.albums.create({
        name: suggestion.name,
        category: categoryMap[suggestion.type] || 'other',
        description: suggestion.description,
      })
      await api.albums.addMedia(newAlbum.id, suggestion.mediaIds)
      addAlbum({ ...newAlbum, mediaCount: suggestion.count })
    } finally {
      setCreatingAlbum(null)
    }
  }

  const getMediaPreview = (mediaIds: string[]) => {
    return mediaIds
      .map((id) => media.find((m) => m.id === id))
      .filter(Boolean)
      .slice(0, 4)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-8 h-8 text-purple-500 animate-pulse" />
          <p className="text-lg text-ink/70">AI 正在分析您的照片...</p>
        </div>
        <div className="w-64 h-2 bg-gold-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 md:p-8 fade-in">
      <Link
        to="/albums"
        className="inline-flex items-center gap-1.5 text-ink/60 hover:text-ink transition mb-6"
      >
        <ArrowLeft size={18} />
        返回相册
      </Link>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="font-display text-3xl golden-underline inline-block">
              <Sparkles className="inline w-8 h-8 mr-2 text-purple-500" />
              AI 智能分类
            </h1>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="p-1.5 rounded-full hover:bg-gold-100 transition text-ink/40 hover:text-ink/60"
              title="AI 分析说明"
            >
              <Info size={18} />
            </button>
          </div>
          <p className="text-ink/60">基于 AI 分析，智能整理您的美好记忆</p>
          {showInfo && (
            <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 max-w-xl">
              <p className="font-medium mb-1">🤖 AI 分类如何工作？</p>
              <p className="mb-1">AI 会基于您照片的<strong>元数据</strong>进行智能分析，包括：</p>
              <ul className="list-disc list-inside text-blue-700 space-y-0.5">
                <li>照片的<strong>标签</strong>（如：旅行、美食、生日等）</li>
                <li>照片中的<strong>人物</strong>标记</li>
                <li>照片的<strong>拍摄地点</strong></li>
                <li>照片的<strong>拍摄时间</strong>（季节、月份、年份、时段）</li>
                <li>照片的<strong>描述</strong>内容</li>
              </ul>
              <p className="mt-2 text-blue-600">💡 提示：为照片添加更多标签、人物和地点信息，AI 分析会更精准！</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedAlbumId}
            onChange={(e) => setSelectedAlbumId(e.target.value)}
            className="border border-gold-300 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gold-500/40 text-ink"
          >
            <option value="all">全部媒体</option>
            {albums.map((album) => (
              <option key={album.id} value={album.id}>{album.name}</option>
            ))}
          </select>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing || loading}
            className={cn(
              'flex items-center gap-2 px-4 py-2 bg-white border border-gold-300 rounded-lg text-ink/70 hover:bg-gold-50 transition',
              (refreshing || loading) && 'opacity-60 cursor-not-allowed'
            )}
          >
            <RefreshCw size={16} className={cn(refreshing && 'animate-spin')} />
            {refreshing ? '分析中...' : '重新分析'}
          </button>
        </div>
      </div>

      {data && (
        <>
          {data.insights.length > 0 && (
            <div className="mb-8">
              <h2 className="font-display text-xl text-ink mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                AI 洞察
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.insights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="bg-gradient-to-br from-white/80 to-gold-50/50 backdrop-blur rounded-xl p-5 border border-gold-200/50 shadow-sm"
                  >
                    <div className="text-3xl mb-2">{insight.icon}</div>
                    <h3 className="font-medium text-ink mb-1">{insight.title}</h3>
                    <p className="text-sm text-ink/60">{insight.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.timelineStory && (
            <div className="mb-8">
              <div
                className="flex items-center justify-between mb-4 cursor-pointer"
                onClick={() => setExpandedStory(!expandedStory)}
              >
                <h2 className="font-display text-xl text-ink flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-500" />
                  时光故事
                </h2>
                {expandedStory ? <ChevronUp size={20} className="text-ink/40" /> : <ChevronDown size={20} className="text-ink/40" />}
              </div>
              {expandedStory && (
                <div className="bg-gradient-to-br from-ivory to-parchment/30 rounded-2xl p-6 border border-gold-200/50">
                  <p className="text-ink/80 leading-relaxed mb-6 text-lg font-medium">
                    {data.timelineStory.summary}
                  </p>
                  <div className="space-y-6">
                    {data.timelineStory.chapters.map((chapter) => (
                      <div key={chapter.year} className="relative pl-8 border-l-2 border-gold-300/50">
                        <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-gold-500 shadow-lg shadow-gold-500/50" />
                        <h3 className="font-display text-lg text-ink mb-2">{chapter.title}</h3>
                        <p className="text-sm text-ink/50 mb-2">{chapter.mediaCount} 张照片</p>
                        {chapter.highlights.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {chapter.highlights.map((h, i) => (
                              <span key={i} className="text-sm text-ink/70 bg-white/60 px-3 py-1 rounded-full">
                                {h}
                              </span>
                            ))}
                          </div>
                        )}
                        {chapter.keyMoments.length > 0 && (
                          <div className="text-sm text-ink/60 italic">
                            "{chapter.keyMoments.join('", "')}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {data.autoAlbumSuggestions.length > 0 && (
            <div className="mb-8">
              <h2 className="font-display text-xl text-ink mb-4 flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-green-500" />
                推荐相册
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.autoAlbumSuggestions.map((suggestion) => {
                  const preview = getMediaPreview(suggestion.mediaIds)
                  return (
                    <div
                      key={suggestion.name}
                      className="bg-white/80 backdrop-blur rounded-xl overflow-hidden border border-gold-200/50 shadow-sm hover:shadow-md transition"
                    >
                      <div className="grid grid-cols-4 gap-0.5 h-32">
                        {preview.map((m, i) => m && (
                          m.type === 'video' && !m.thumbnailUrl ? (
                            <video
                              key={i}
                              src={m.url}
                              preload="metadata"
                              muted
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <img
                              key={i}
                              src={m.thumbnailUrl || m.url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          )
                        ))}
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl">{suggestion.icon}</span>
                          <h3 className="font-medium text-ink">{suggestion.name}</h3>
                        </div>
                        <p className="text-sm text-ink/60 mb-3">{suggestion.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-ink/40">{suggestion.count} 张照片</span>
                          <button
                            onClick={() => handleCreateAlbum(suggestion)}
                            disabled={creatingAlbum === suggestion.name}
                            className={cn(
                              'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition',
                              creatingAlbum === suggestion.name
                                ? 'bg-grey-100 text-grey-400'
                                : 'bg-green-500 text-white hover:bg-green-600'
                            )}
                          >
                            {creatingAlbum === suggestion.name ? (
                              <>
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                创建中
                              </>
                            ) : (
                              <>
                                <Check size={14} />
                                创建相册
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div>
            <h2 className="font-display text-xl text-ink mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              智能分组
            </h2>

            <div className="flex flex-wrap gap-2 mb-6">
              {(Object.keys(GROUP_CONFIG) as GroupType[]).map((type) => {
                const config = GROUP_CONFIG[type]
                const Icon = config.icon
                const count = data.groups[type]?.length || 0
                return (
                  <button
                    key={type}
                    onClick={() => setActiveGroup(type)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
                      activeGroup === type
                        ? `bg-gradient-to-r ${config.color} text-white shadow-md`
                        : 'bg-white/60 text-ink/70 hover:bg-white/80'
                    )}
                  >
                    <Icon size={16} />
                    {config.label}
                    <span className={cn(
                      'px-1.5 py-0.5 rounded-full text-xs',
                      activeGroup === type ? 'bg-white/20' : 'bg-ink/10'
                    )}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            {currentGroup.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-ink/60">
                <Sparkles size={48} className="mb-3 text-gold-500/50" />
                <p className="text-lg">暂无 {GROUP_CONFIG[activeGroup].label} 分组</p>
                <p className="text-sm mt-1">添加更多标签和元数据来获得更精准的分类</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {currentGroup.map((group: AIGroupItem) => {
                  const preview = getMediaPreview(group.mediaIds)
                  return (
                    <div
                      key={group.name}
                      onClick={() => navigate(`/?tag=${encodeURIComponent(group.name)}`)}
                      className="bg-white/80 backdrop-blur rounded-xl overflow-hidden border border-gold-200/50 shadow-sm hover:shadow-md transition cursor-pointer group"
                    >
                      <div className="relative grid grid-cols-4 gap-0.5 h-28">
                        {preview.map((m, i) => m && (
                          m.type === 'video' && !m.thumbnailUrl ? (
                            <video
                              key={i}
                              src={m.url}
                              preload="metadata"
                              muted
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <img
                              key={i}
                              src={m.thumbnailUrl || m.url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          )
                        ))}
                        {preview.length === 0 && (
                          <div className="col-span-4 flex items-center justify-center bg-gold-50">
                            <FolderPlus size={32} className="text-gold-300" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                          {group.count} 张
                        </div>
                      </div>
                      <div className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{group.icon}</span>
                          <h3 className="font-medium text-ink truncate group-hover:text-gold-600 transition">
                            {group.name}
                          </h3>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {toast && (
        <div className={cn(
          'fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-bounce',
          toast.type === 'success' && 'bg-green-500 text-white',
          toast.type === 'error' && 'bg-red-500 text-white',
          toast.type === 'info' && 'bg-blue-500 text-white'
        )}>
          {toast.type === 'success' && <Check size={18} />}
          {toast.type === 'error' && <RefreshCw size={18} />}
          {toast.type === 'info' && <Info size={18} />}
          <span className="max-w-md text-sm">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70">
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
