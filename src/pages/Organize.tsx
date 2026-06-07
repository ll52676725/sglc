import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Sparkles,
  FolderOpen,
  Image,
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
  Plus,
  Filter,
  Grid3X3,
  List,
  Play,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useStore } from '@/store/useStore'
import type { AIClassificationResult, AIGroupItem, AIAutoAlbumSuggestion, Album, MediaItem } from '@/types'
import { CATEGORY_LABELS } from '@/types'
import { cn } from '@/lib/utils'

type TabType = 'ai' | 'albums' | 'all'
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

const TABS: { key: TabType; label: string; icon: any }[] = [
  { key: 'ai', label: 'AI 分类', icon: Sparkles },
  { key: 'albums', label: '相册', icon: FolderOpen },
  { key: 'all', label: '全部媒体', icon: Grid3X3 },
]

export default function Organize() {
  const navigate = useNavigate()
  const { media, setMedia, albums, setAlbums, addAlbum } = useStore()
  const [activeTab, setActiveTab] = useState<TabType>('ai')
  const [aiData, setAiData] = useState<AIClassificationResult | null>(null)
  const [aiLoading, setAiLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeGroup, setActiveGroup] = useState<GroupType>('people')
  const [expandedStory, setExpandedStory] = useState(true)
  const [creatingAlbum, setCreatingAlbum] = useState<string | null>(null)
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('all')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [showInfo, setShowInfo] = useState(false)
  const [showCreateAlbum, setShowCreateAlbum] = useState(false)
  const [albumForm, setAlbumForm] = useState({ name: '', category: 'holiday' as Album['category'], description: '' })
  const [submitting, setSubmitting] = useState(false)

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

  const loadAiData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setAiLoading(true)
    }

    try {
      await refreshMedia()
      const result = await api.ai.classify(selectedAlbumId === 'all' ? undefined : selectedAlbumId)
      
      setAiData(prev => {
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
      setAiLoading(false)
      setRefreshing(false)
    }
  }, [selectedAlbumId, refreshMedia, showToast])

  useEffect(() => {
    if (activeTab === 'ai') {
      loadAiData()
    }
  }, [activeTab, selectedAlbumId])

  useEffect(() => {
    api.albums.list().then(setAlbums)
  }, [setAlbums])

  const currentGroup = useMemo(() => {
    if (!aiData) return []
    return aiData.groups[activeGroup] || []
  }, [aiData, activeGroup])

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
      showToast(`相册「${suggestion.name}」创建成功！`, 'success')
    } finally {
      setCreatingAlbum(null)
    }
  }

  const handleCreateNewAlbum = async () => {
    if (!albumForm.name.trim()) return
    setSubmitting(true)
    try {
      const album = await api.albums.create(albumForm)
      addAlbum(album)
      setShowCreateAlbum(false)
      setAlbumForm({ name: '', category: 'holiday', description: '' })
      showToast('相册创建成功！', 'success')
    } finally {
      setSubmitting(false)
    }
  }

  const getMediaPreview = (mediaIds: string[]) => {
    return mediaIds
      .map((id) => media.find((m) => m.id === id))
      .filter(Boolean)
      .slice(0, 4)
  }

  const renderAiTab = () => {
    if (aiLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-24">
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

    if (!aiData) {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-ink/60">
          <Sparkles size={48} className="mb-4 text-gold-500/50" />
          <p className="text-lg mb-2">暂无分析结果</p>
          <p className="text-sm mb-6 text-ink/40">上传更多照片并添加标签，开始 AI 智能分类</p>
          <button
            onClick={() => loadAiData(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            <Sparkles size={18} />
            开始 AI 分析
          </button>
        </div>
      )
    }

    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="font-display text-2xl text-ink flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-500" />
                AI 智能分类
              </h2>
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
              onClick={() => loadAiData(true)}
              disabled={refreshing || aiLoading}
              className={cn(
                'flex items-center gap-2 px-4 py-2 bg-white border border-gold-300 rounded-lg text-ink/70 hover:bg-gold-50 transition',
                (refreshing || aiLoading) && 'opacity-60 cursor-not-allowed'
              )}
            >
              <RefreshCw size={16} className={cn(refreshing && 'animate-spin')} />
              {refreshing ? '分析中...' : '重新分析'}
            </button>
          </div>
        </div>

        {aiData.insights.length > 0 && (
          <div>
            <h3 className="font-display text-xl text-ink mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              AI 洞察
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aiData.insights.map((insight, idx) => (
                <div
                  key={idx}
                  className="bg-gradient-to-br from-white/80 to-gold-50/50 backdrop-blur rounded-xl p-5 border border-gold-200/50 shadow-sm"
                >
                  <div className="text-3xl mb-2">{insight.icon}</div>
                  <h4 className="font-medium text-ink mb-1">{insight.title}</h4>
                  <p className="text-sm text-ink/60">{insight.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {aiData.timelineStory && (
          <div>
            <div
              className="flex items-center justify-between mb-4 cursor-pointer"
              onClick={() => setExpandedStory(!expandedStory)}
            >
              <h3 className="font-display text-xl text-ink flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-500" />
                时光故事
              </h3>
              {expandedStory ? <ChevronUp size={20} className="text-ink/40" /> : <ChevronDown size={20} className="text-ink/40" />}
            </div>
            {expandedStory && (
              <div className="bg-gradient-to-br from-ivory to-parchment/30 rounded-2xl p-6 border border-gold-200/50">
                <p className="text-ink/80 leading-relaxed mb-6 text-lg font-medium">
                  {aiData.timelineStory.summary}
                </p>
                <div className="space-y-6">
                  {aiData.timelineStory.chapters.map((chapter) => (
                    <div key={chapter.year} className="relative pl-8 border-l-2 border-gold-300/50">
                      <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-gold-500 shadow-lg shadow-gold-500/50" />
                      <h4 className="font-display text-lg text-ink mb-2">{chapter.title}</h4>
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
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {aiData.autoAlbumSuggestions.length > 0 && (
          <div>
            <h3 className="font-display text-xl text-ink mb-4 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-green-500" />
              推荐相册
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aiData.autoAlbumSuggestions.map((suggestion) => {
                const preview = getMediaPreview(suggestion.mediaIds)
                return (
                  <div
                    key={suggestion.name}
                    className="bg-white/80 backdrop-blur rounded-xl overflow-hidden border border-gold-200/50 shadow-sm hover:shadow-md transition"
                  >
                    <div className="grid grid-cols-4 gap-0.5 h-32">
                      {preview.map((m, i) => m && (
                        <img
                          key={i}
                          src={m.thumbnailUrl || m.url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ))}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{suggestion.icon}</span>
                        <h4 className="font-medium text-ink">{suggestion.name}</h4>
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
          <h3 className="font-display text-xl text-ink mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            智能分组
          </h3>

          <div className="flex flex-wrap gap-2 mb-6">
            {(Object.keys(GROUP_CONFIG) as GroupType[]).map((type) => {
              const config = GROUP_CONFIG[type]
              const Icon = config.icon
              const count = aiData.groups[type]?.length || 0
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {currentGroup.map((group: AIGroupItem) => {
                const preview = getMediaPreview(group.mediaIds)
                return (
                  <div
                    key={group.name}
                    className="bg-white/80 backdrop-blur rounded-xl overflow-hidden border border-gold-200/50 shadow-sm hover:shadow-md transition cursor-pointer group"
                  >
                    <div className="relative grid grid-cols-4 gap-0.5 h-28">
                      {preview.map((m, i) => m && (
                        <img
                          key={i}
                          src={m.thumbnailUrl || m.url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
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
                        <h4 className="font-medium text-ink truncate group-hover:text-gold-600 transition">
                          {group.name}
                        </h4>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderAlbumsTab = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl text-ink flex items-center gap-2">
              <FolderOpen className="w-6 h-6 text-emerald-500" />
              我的相册
            </h2>
            <p className="text-ink/60 mt-1">管理和整理您的照片合集</p>
          </div>
          <button
            onClick={() => setShowCreateAlbum(true)}
            className="flex items-center gap-2 bg-gold-500 text-white px-5 py-2.5 rounded-xl hover:bg-gold-600 transition font-medium"
          >
            <Plus size={18} />
            创建相册
          </button>
        </div>

        {albums.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-ink/60 bg-gradient-to-br from-gold-50/50 to-white/50 rounded-2xl border border-gold-200/30">
            <div className="w-20 h-20 rounded-full bg-gold-100 flex items-center justify-center mb-6">
              <FolderOpen size={40} className="text-gold-400" />
            </div>
            <p className="text-xl font-medium mb-2">还没有相册</p>
            <p className="text-sm mb-8 text-ink/40 max-w-md text-center">
              创建相册来归类您的珍贵回忆<br />
              或者试试 AI 智能分类，让 AI 帮您自动创建
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateAlbum(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                <Plus size={18} />
                创建相册
              </button>
              <button
                onClick={() => setActiveTab('ai')}
                className="flex items-center gap-2 px-6 py-3 bg-white border border-gold-300 text-ink/70 rounded-xl hover:bg-gold-50 transition-all"
              >
                <Sparkles size={18} />
                AI 智能分类
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {albums.map((album) => (
              <div
                key={album.id}
                onClick={() => navigate(`/albums/${album.id}`)}
                className="rounded-xl overflow-hidden bg-white/80 shadow-md hover:shadow-xl transition cursor-pointer"
              >
                <div className="relative">
                  {album.coverMediaId ? (
                    <div className="w-full aspect-[4/3] bg-gradient-to-br from-gold-200 to-gold-300 flex items-center justify-center">
                      <FolderOpen size={48} className="text-gold-500/50" />
                    </div>
                  ) : (
                    <div className="w-full aspect-[4/3] bg-gradient-to-br from-gold-100 to-gold-200 flex items-center justify-center">
                      <FolderOpen size={48} className="text-gold-500/50" />
                    </div>
                  )}
                  {album.category && (
                    <span className="absolute top-3 right-3 bg-gold-500/90 text-white text-xs px-2.5 py-1 rounded-full">
                      {CATEGORY_LABELS[album.category]}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-ink truncate">{album.name}</h3>
                  <p className="text-sm text-ink/60 mt-1">{album.mediaCount} 项媒体</p>
                  {album.earliestDate && (
                    <p className="text-sm text-ink/50 mt-1">
                      {album.earliestDate?.slice(0, 10)} ~ {album.latestDate?.slice(0, 10)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderAllTab = () => {
    const photos = media.filter(m => m.type === 'photo')
    const videos = media.filter(m => m.type === 'video')

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl text-ink flex items-center gap-2">
              <Grid3X3 className="w-6 h-6 text-blue-500" />
              全部媒体
            </h2>
            <p className="text-ink/60 mt-1">共 {media.length} 个文件（{photos.length} 张照片，{videos.length} 个视频）</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gold-300 rounded-lg text-ink/70 hover:bg-gold-50 transition">
              <Filter size={16} />
              筛选
            </button>
          </div>
        </div>

        {media.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-ink/60 bg-gradient-to-br from-gold-50/50 to-white/50 rounded-2xl border border-gold-200/30">
            <div className="w-20 h-20 rounded-full bg-gold-100 flex items-center justify-center mb-6">
              <Image size={40} className="text-gold-400" />
            </div>
            <p className="text-xl font-medium mb-2">还没有媒体</p>
            <p className="text-sm mb-8 text-ink/40">上传您的第一张照片或视频，开始记录美好时光</p>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              <Plus size={18} />
              去上传媒体
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
            {media.map((item) => (
              <div
                key={item.id}
                className="relative aspect-square rounded-lg overflow-hidden bg-gold-100 group cursor-pointer hover:ring-2 hover:ring-gold-400 transition-all"
                onClick={() => navigate(`/media/${item.id}`)}
              >
                {item.type === 'video' ? (
                  <div className="w-full h-full flex items-center justify-center">
                    {item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gold-200 flex items-center justify-center">
                        <Play size={24} className="text-gold-600" />
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                      视频
                    </div>
                  </div>
                ) : (
                  <img src={item.thumbnailUrl || item.url} alt="" className="w-full h-full object-cover" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-text-primary inline-block mb-2">🗂️ 智能整理</h1>
          <p className="text-text-secondary text-sm sm:text-base">AI 帮您归类整理，让记忆井井有条</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'ai' && (
            <button
              onClick={() => loadAiData(true)}
              disabled={refreshing || aiLoading}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-surface border border-border rounded-lg text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
              <span className="hidden sm:inline">重新分析</span>
            </button>
          )}
          <button
            onClick={() => setShowCreateAlbum(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 shadow-md shadow-primary-500/20 hover:shadow-lg hover:shadow-primary-500/30 transition-all active:scale-[0.98]"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">创建相册</span>
            <span className="sm:hidden">创建</span>
          </button>
        </div>
      </div>

      <div className="inline-flex flex-wrap bg-surface p-1 rounded-xl border border-border mb-6 sm:mb-8 gap-1">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                activeTab === tab.key
                  ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              )}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'ai' && renderAiTab()}
      {activeTab === 'albums' && renderAlbumsTab()}
      {activeTab === 'all' && renderAllTab()}

      {showCreateAlbum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm" onClick={() => setShowCreateAlbum(false)}>
          <div className="bg-ivory rounded-2xl p-6 w-[480px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-xl mb-6">创建相册</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1">相册名称</label>
                <input
                  type="text"
                  value={albumForm.name}
                  onChange={(e) => setAlbumForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gold-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gold-500/40"
                  placeholder="输入相册名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1">分类</label>
                <select
                  value={albumForm.category}
                  onChange={(e) => setAlbumForm((f) => ({ ...f, category: e.target.value as Album['category'] }))}
                  className="w-full border border-gold-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gold-500/40"
                >
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1">描述</label>
                <textarea
                  value={albumForm.description}
                  onChange={(e) => setAlbumForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gold-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gold-500/40 resize-none"
                  rows={3}
                  placeholder="简单描述这个相册"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateAlbum(false)}
                className="px-4 py-2 rounded-lg text-ink/70 hover:bg-ink/5 transition"
              >
                取消
              </button>
              <button
                onClick={handleCreateNewAlbum}
                disabled={submitting || !albumForm.name.trim()}
                className="px-5 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition disabled:opacity-50"
              >
                创建
              </button>
            </div>
          </div>
        </div>
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
