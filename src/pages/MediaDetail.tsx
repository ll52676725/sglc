import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { X, ChevronLeft, ChevronRight, Save, Trash2, MapPin, Calendar, Tag, Users, FolderOpen, Check, Loader2, Clock, FileVideo, Info } from 'lucide-react'
import { api } from '@/lib/api'
import { useStore } from '@/store/useStore'
import { CATEGORY_LABELS } from '@/types'
import type { MediaItem, Album } from '@/types'
import { cn, formatFileSize } from '@/lib/utils'
import VideoPlayer from '@/components/VideoPlayer'

export default function MediaDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { media: mediaList, removeMedia, updateMediaItem, albums, setAlbums } = useStore()
  const [item, setItem] = useState<MediaItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [showToast, setShowToast] = useState(false)
  const [albumIds, setAlbumIds] = useState<string[]>([])

  const [description, setDescription] = useState('')
  const [dateTaken, setDateTaken] = useState('')
  const [location, setLocation] = useState('')
  const [peopleInput, setPeopleInput] = useState('')
  const [tagsInput, setTagsInput] = useState('')

  useEffect(() => {
    if (albums.length === 0) {
      api.albums.list().then(setAlbums)
    }
  }, [albums.length, setAlbums])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    api.media.get(id).then((data) => {
      const media = {
        ...data,
        people: data.people ? (Array.isArray(data.people) ? data.people.map((p: any) => typeof p === 'string' ? p : p.name) : []) : [],
        tags: data.tags ? (Array.isArray(data.tags) ? data.tags.map((t: any) => typeof t === 'string' ? t : t.tag) : []) : [],
        albumIds: data.albumIds || [],
      }
      setItem(media)
      setDescription(media.description || '')
      setDateTaken(media.dateTaken ? media.dateTaken.slice(0, 16) : '')
      setLocation(media.location || '')
      setPeopleInput((media.people || []).join(', '))
      setTagsInput((media.tags || []).join(', '))
      setAlbumIds(media.albumIds || [])
    }).finally(() => setLoading(false))
  }, [id])

  const currentIndex = mediaList.findIndex((m) => m.id === id)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < mediaList.length - 1

  const toggleAlbum = async (albumId: string) => {
    setAlbumIds(prev => {
      if (prev.includes(albumId)) {
        return prev.filter(a => a !== albumId)
      } else {
        return [...prev, albumId]
      }
    })
  }

  const handleSave = async () => {
    if (!id) return
    try {
      const people = peopleInput.split(',').map((s) => s.trim()).filter(Boolean)
      const tags = tagsInput.split(',').map((s) => s.trim()).filter(Boolean)
      await api.media.update(id, {
        description,
        dateTaken: dateTaken || null,
        location,
        people,
        tags,
        albumIds,
      })
      updateMediaItem(id, { description, dateTaken, location, people, tags, albumIds })
      setShowToast(true)
      setTimeout(() => setShowToast(false), 2000)
    } catch {}
  }

  const handleDelete = async () => {
    if (!id) return
    if (!window.confirm('确定要删除这张照片吗？此操作不可撤销。')) return
    try {
      await api.media.delete(id)
      removeMedia(id)
      navigate('/')
    } catch {}
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-ink/90 flex items-center justify-center z-50">
        <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="fixed inset-0 bg-ink/90 flex items-center justify-center z-50 text-white/60">
        <p>未找到该媒体</p>
      </div>
    )
  }

  const peopleList = peopleInput.split(',').map((s) => s.trim()).filter(Boolean)
  const tagsList = tagsInput.split(',').map((s) => s.trim()).filter(Boolean)

  return (
    <div className="fixed inset-0 bg-ink/90 z-50 flex">
      <div className="flex-1 flex items-center justify-center relative">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-10 p-2 rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition"
        >
          <X size={20} />
        </button>

        {hasPrev && (
          <button
            onClick={() => navigate(`/media/${mediaList[currentIndex - 1].id}`)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {hasNext && (
          <button
            onClick={() => navigate(`/media/${mediaList[currentIndex + 1].id}`)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition"
          >
            <ChevronRight size={24} />
          </button>
        )}

        {item.type === 'video' ? (
          <div className="relative">
            {item.processingStatus === 'processing' ? (
              <div className="flex flex-col items-center justify-center bg-black/30 rounded-lg p-12 max-w-[70vw]">
                <Loader2 className="w-12 h-12 text-white animate-spin mb-4" />
                <p className="text-white/80 text-lg mb-2">视频处理中...</p>
                <p className="text-white/50 text-sm">转码完成后即可播放</p>
              </div>
            ) : (
              <VideoPlayer
                src={item.url}
                hlsMasterUrl={item.hlsMasterUrl}
                qualities={item.videoQualities}
                poster={item.thumbnailUrl}
                className="max-h-[80vh] max-w-[70vw] shadow-2xl"
              />
            )}
          </div>
        ) : (
          <img
            src={item.url}
            alt={item.description || item.filename}
            className="max-h-[80vh] object-contain rounded-lg shadow-2xl"
          />
        )}
      </div>

      <div className="w-80 bg-ivory rounded-l-2xl slide-in-right overflow-y-auto p-6 flex flex-col">
        <h2 className="font-display text-xl text-ink golden-underline inline-block mb-6">记忆详情</h2>

        <div className="space-y-4 flex-1">
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gold-700 mb-1">
              <Calendar size={14} /> 拍摄时间
            </label>
            <input
              type="datetime-local"
              value={dateTaken}
              onChange={(e) => setDateTaken(e.target.value)}
              className="w-full border border-gold-200 rounded-lg px-3 py-2 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gold-700 mb-1">
              <MapPin size={14} /> 地点
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="添加拍摄地点"
              className="w-full border border-gold-200 rounded-lg px-3 py-2 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gold-700 mb-1 block">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="记录这一刻的故事..."
              className="w-full border border-gold-200 rounded-lg px-3 py-2 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-gold-400 resize-none"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gold-700 mb-1">
              <Users size={14} /> 人物标签
            </label>
            <input
              type="text"
              value={peopleInput}
              onChange={(e) => setPeopleInput(e.target.value)}
              placeholder="逗号分隔，如：妈妈，爸爸"
              className="w-full border border-gold-200 rounded-lg px-3 py-2 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
            {peopleList.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {peopleList.map((p, i) => (
                  <span key={i} className="inline-flex bg-gold-100 text-gold-700 rounded-full px-3 py-0.5 text-xs">
                    {p}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gold-700 mb-1">
              <Tag size={14} /> 标签
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="逗号分隔，如：旅行，海边"
              className="w-full border border-gold-200 rounded-lg px-3 py-2 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
            {tagsList.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tagsList.map((t, i) => (
                  <span key={i} className="inline-flex bg-parchment text-ink/70 rounded-full px-3 py-0.5 text-xs">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gold-700 mb-2">
              <FolderOpen size={14} /> 所属相册
            </label>
            {albums.length === 0 ? (
              <p className="text-ink/40 text-sm">还没有相册，先去创建一个吧</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {albums.map((album) => (
                  <div
                    key={album.id}
                    onClick={() => toggleAlbum(album.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition',
                      albumIds.includes(album.id)
                        ? 'bg-gold-100 border border-gold-300'
                        : 'bg-white/50 border border-transparent hover:bg-white/80'
                    )}
                  >
                    <div className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                      albumIds.includes(album.id)
                        ? 'bg-gold-500 border-gold-500'
                        : 'border-gold-300'
                    )}>
                      {albumIds.includes(album.id) && <Check size={10} className="text-white" />}
                    </div>
                    <span className={cn(
                      'text-sm flex-1 truncate',
                      albumIds.includes(album.id) ? 'text-gold-700 font-medium' : 'text-ink/70'
                    )}>
                      {album.name}
                    </span>
                    <span className="text-xs text-ink/40">
                      {CATEGORY_LABELS[album.category]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {item.type === 'video' && (
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gold-700 mb-2">
                <FileVideo size={14} /> 视频信息
              </label>
              <div className="bg-white/50 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                <span className="text-ink/50">文件名</span>
                <span className="text-ink/80 truncate max-w-[160px]" title={item.filename}>{item.filename}</span>
              </div>
              {item.duration !== undefined && item.duration > 0 && (
                <div className="flex justify-between">
                  <span className="text-ink/50">时长</span>
                  <span className="text-ink/80">{Math.floor(item.duration / 60)}分{Math.floor(item.duration % 60)}秒</span>
                </div>
              )}
              {item.width && item.height && (
                <div className="flex justify-between">
                  <span className="text-ink/50">分辨率</span>
                  <span className="text-ink/80">{item.width} × {item.height}</span>
                </div>
              )}
              {item.url && (
                <div className="flex justify-between">
                  <span className="text-ink/50">格式</span>
                  <span className="text-ink/80 uppercase">{item.url.split('.').pop()}</span>
                </div>
              )}
              {item.videoQualities && item.videoQualities.length > 0 && (
                <div className="pt-2 border-t border-gold-100">
                  <p className="text-ink/50 text-xs mb-1">可用画质</p>
                  <div className="flex flex-wrap gap-1">
                    {item.videoQualities.map((q, i) => (
                      <span key={i} className="bg-gold-100 text-gold-700 px-2 py-0.5 rounded text-xs">
                        {q.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {item.processingStatus && (
                <div className="pt-2 border-t border-gold-100">
                  <div className="flex items-center gap-2">
                    {item.processingStatus === 'processing' ? (
                      <>
                        <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                        <span className="text-blue-600 text-xs">转码处理中...</span>
                      </>
                    ) : item.processingStatus === 'completed' ? (
                      <>
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-green-600 text-xs">处理完成</span>
                      </>
                    ) : item.processingStatus === 'failed' ? (
                      <>
                        <X className="w-4 h-4 text-red-500" />
                        <span className="text-red-600 text-xs">处理失败</span>
                      </>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>
          )}
        </div>

        <button
          onClick={handleSave}
          className="flex items-center justify-center gap-2 w-full bg-gold-500 text-white rounded-xl py-2.5 mt-4 hover:bg-gold-600 transition font-medium"
        >
          <Save size={16} /> 保存修改
        </button>

        <button
          onClick={handleDelete}
          className="flex items-center justify-center gap-2 w-full bg-red-50 text-red-600 rounded-xl py-2.5 mt-2 hover:bg-red-100 transition font-medium"
        >
          <Trash2 size={16} /> 删除
        </button>
      </div>

      {showToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-2.5 rounded-xl shadow-lg z-[60] fade-in">
          保存成功
        </div>
      )}
    </div>
  )
}
