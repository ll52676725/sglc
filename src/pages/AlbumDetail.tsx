import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Play, FolderOpen, Upload, Library, Check, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useStore } from '@/store/useStore'
import { CATEGORY_LABELS } from '@/types'
import type { Album, MediaItem } from '@/types'
import { cn } from '@/lib/utils'

export default function AlbumDetail() {
  const { albumId } = useParams<{ albumId: string }>()
  const navigate = useNavigate()
  const { media: allMedia, setMedia: setAllMedia, addMedia } = useStore()
  const [album, setAlbum] = useState<Album | null>(null)
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addTab, setAddTab] = useState<'library' | 'upload'>('library')
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set())
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!albumId) return
    setLoading(true)
    Promise.all([
      api.albums.get(albumId),
      allMedia.length === 0 ? api.media.list({ limit: '100' }).then(d => { setAllMedia(d.items || []); return d }) : null,
    ]).then(([albumData]) => {
      setAlbum(albumData)
      setMedia(albumData.media || [])
    }).finally(() => setLoading(false))
  }, [albumId, allMedia.length, setAllMedia])

  const mediaNotInAlbum = allMedia.filter(m => !media.some(am => am.id === m.id))

  const handleToggleSelect = (id: string) => {
    setSelectedMedia(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleAddFromLibrary = async () => {
    if (!albumId || selectedMedia.size === 0) return
    setSaving(true)
    try {
      await api.albums.addMedia(albumId, Array.from(selectedMedia))
      const newMedia = allMedia.filter(m => selectedMedia.has(m.id))
      setMedia(prev => [...prev, ...newMedia])
      setSelectedMedia(new Set())
      setShowAddModal(false)
    } finally {
      setSaving(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !albumId) return
    setUploading(true)
    try {
      const result = await api.media.upload(Array.from(files), albumId)
      const items = Array.isArray(result) ? result : []
      if (items.length > 0) {
        addMedia(items)
        setMedia(prev => [...prev, ...items])
      }
      setShowAddModal(false)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveMedia = async (mediaId: string) => {
    if (!albumId) return
    if (!window.confirm('确定要从相册中移除这张照片吗？')) return
    try {
      await api.albums.removeMedia(albumId, mediaId)
      setMedia(prev => prev.filter(m => m.id !== mediaId))
    } catch {}
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!album) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-ink/60">
        <p className="text-lg">相册不存在</p>
        <Link to="/albums" className="mt-4 text-gold-500 hover:underline">返回相册列表</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 fade-in">
      <Link
        to="/albums"
        className="inline-flex items-center gap-1.5 text-ink/60 hover:text-ink transition mb-4 sm:mb-6"
      >
        <ArrowLeft size={18} />
        返回相册
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-display text-xl sm:text-2xl text-ink">{album.name}</h1>
            {album.category && (
              <span className="bg-gold-500/10 text-gold-600 text-xs px-2.5 py-1 rounded-full">
                {CATEGORY_LABELS[album.category]}
              </span>
            )}
          </div>
          {album.description && (
            <p className="text-ink/60 mt-1">{album.description}</p>
          )}
          {album.earliestDate && (
            <p className="text-sm text-ink/50 mt-1">
              {album.earliestDate?.slice(0, 10)} ~ {album.latestDate?.slice(0, 10)}
            </p>
          )}
          <p className="text-sm text-ink/50 mt-1">共 {media.length} 项记忆</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-gold-500 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl hover:bg-gold-600 transition font-medium text-sm sm:text-base self-start sm:self-auto"
        >
          <Plus size={16} />
          添加照片
        </button>
      </div>

      {media.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-ink/60">
          <FolderOpen size={64} className="mb-4 text-gold-500/50" />
          <p className="text-lg mb-4">相册还是空的</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-gold-500 text-white px-5 py-2.5 rounded-xl hover:bg-gold-600 transition font-medium"
          >
            <Plus size={18} />
            添加第一张照片
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
          {media.map((item) => (
            <div
              key={item.id}
              className="aspect-square rounded-lg overflow-hidden bg-white/80 shadow-sm hover:shadow-md transition group relative"
            >
              {item.type === 'video' && !item.thumbnailUrl ? (
                <video
                  src={item.url}
                  preload="metadata"
                  muted
                  playsInline
                  onClick={() => navigate(`/media/${item.id}`)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                />
              ) : (
                <img
                  src={item.thumbnailUrl || item.url}
                  alt={item.description || item.filename}
                  onClick={() => navigate(`/media/${item.id}`)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                />
              )}
              {item.type === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-ink/40 flex items-center justify-center group-hover:bg-ink/60 transition">
                    <Play size={20} className="text-white ml-0.5" fill="white" />
                  </div>
                </div>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); handleRemoveMedia(item.id) }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition hover:bg-red-600"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <div
            onClick={() => setShowAddModal(true)}
            className="aspect-square rounded-lg border-2 border-dashed border-gold-300 flex flex-col items-center justify-center hover:border-gold-500 hover:bg-gold-50/30 transition cursor-pointer group"
          >
            <Plus size={28} className="text-gold-400 group-hover:text-gold-500 transition mb-1" />
            <span className="text-sm text-gold-400 group-hover:text-gold-500 transition">添加</span>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-2 sm:p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-ivory rounded-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[85vh] shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gold-200">
              <h2 className="font-display text-lg sm:text-xl">添加照片到相册</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-ink/5 rounded-lg transition">
                <X size={20} className="text-ink/60" />
              </button>
            </div>

            <div className="flex border-b border-gold-200">
              <button
                onClick={() => setAddTab('library')}
                className={cn(
                  'flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 font-medium transition text-sm sm:text-base',
                  addTab === 'library' ? 'text-gold-600 border-b-2 border-gold-500' : 'text-ink/60 hover:text-ink'
                )}
              >
                <Library size={16} />
                从媒体库选择
              </button>
              <button
                onClick={() => setAddTab('upload')}
                className={cn(
                  'flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 font-medium transition text-sm sm:text-base',
                  addTab === 'upload' ? 'text-gold-600 border-b-2 border-gold-500' : 'text-ink/60 hover:text-ink'
                )}
              >
                <Upload size={16} />
                上传新照片
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {addTab === 'library' ? (
                <>
                  {mediaNotInAlbum.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-ink/60">
                      <FolderOpen size={48} className="mb-3 text-gold-500/50" />
                      <p className="text-lg">媒体库中没有更多照片了</p>
                      <p className="text-sm mt-1">去上传一些新照片吧</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                      {mediaNotInAlbum.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleToggleSelect(item.id)}
                          className={cn(
                            'aspect-square rounded-lg overflow-hidden cursor-pointer relative transition-all',
                            selectedMedia.has(item.id)
                              ? 'ring-4 ring-gold-500 ring-offset-2'
                              : 'hover:ring-2 hover:ring-gold-300'
                          )}
                        >
                          {item.type === 'video' ? (
                            <video
                              src={item.url}
                              preload="metadata"
                              muted
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <img
                              src={item.thumbnailUrl || item.url}
                              alt={item.description || item.filename}
                              className="w-full h-full object-cover"
                            />
                          )}
                          {selectedMedia.has(item.id) && (
                            <div className="absolute top-2 right-2 bg-gold-500 rounded-full p-1">
                              <Check size={14} className="text-white" />
                            </div>
                          )}
                          {item.type === 'video' && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-6 h-6 rounded-full bg-ink/40 flex items-center justify-center">
                                <Play size={12} className="text-white ml-0.5" fill="white" />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {uploading ? (
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin mb-4" />
                      <p className="text-ink/70">正在上传...</p>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gold-300 rounded-2xl p-6 sm:p-12 text-center cursor-pointer hover:border-gold-500 hover:bg-gold-50/30 transition w-full max-w-md"
                    >
                      <Upload className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gold-400" />
                      <p className="text-base sm:text-lg text-ink/70 mb-1">点击选择文件上传</p>
                      <p className="text-xs sm:text-sm text-ink/40">支持 JPG、PNG、GIF、MP4、MOV 格式</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {addTab === 'library' && (
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 sm:p-6 border-t border-gold-200 bg-gold-50/50 rounded-b-2xl gap-3">
                <p className="text-ink/60 text-sm">
                  已选择 <span className="font-semibold text-gold-600">{selectedMedia.size}</span> 张照片
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 sm:px-5 py-2 rounded-lg text-ink/70 hover:bg-ink/5 transition text-sm"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleAddFromLibrary}
                    disabled={selectedMedia.size === 0 || saving}
                    className="px-4 sm:px-5 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                  >
                    {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {saving ? '添加中...' : '添加到相册'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
