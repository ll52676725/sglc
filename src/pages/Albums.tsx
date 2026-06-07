import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FolderOpen, Sparkles } from 'lucide-react'
import { api } from '@/lib/api'
import { useStore } from '@/store/useStore'
import { CATEGORY_LABELS } from '@/types'
import type { Album } from '@/types'

export default function Albums() {
  const navigate = useNavigate()
  const { albums, setAlbums, addAlbum } = useStore()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', category: 'holiday' as Album['category'], description: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.albums.list().then(setAlbums)
  }, [setAlbums])

  const handleCreate = async () => {
    if (!form.name.trim()) return
    setSubmitting(true)
    try {
      const album = await api.albums.create(form)
      addAlbum(album)
      setShowModal(false)
      setForm({ name: '', category: 'holiday', description: '' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="font-display text-2xl sm:text-3xl text-text-primary theme-accent-underline inline-block">我的相册</h1>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            onClick={() => navigate('/ai-classify')}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl hover:from-purple-600 hover:to-pink-600 transition font-medium shadow-md hover:shadow-lg text-sm"
          >
            <Sparkles size={16} />
            <span className="hidden sm:inline">AI 智能分类</span>
            <span className="sm:hidden">AI分类</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-primary-500 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl hover:bg-primary-600 transition font-medium text-sm"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">创建相册</span>
            <span className="sm:hidden">创建</span>
          </button>
        </div>
      </div>

      {albums.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 sm:py-32 text-text-secondary">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary-100 flex items-center justify-center mb-4">
            <FolderOpen size={32} className="sm:w-12 sm:h-12 text-primary-400" />
          </div>
          <p className="text-base sm:text-lg mb-6 text-text-secondary">还没有相册</p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-primary-500 text-white px-5 py-2.5 rounded-xl hover:bg-primary-600 transition font-medium text-sm"
          >
            <Plus size={16} />
            创建相册
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {albums.map((album) => (
            <div
              key={album.id}
              onClick={() => navigate(`/albums/${album.id}`)}
              className="rounded-xl overflow-hidden bg-surface shadow-soft hover:shadow-medium transition-all duration-300 cursor-pointer border border-border hover:border-primary-200 group"
            >
              <div className="relative">
                {album.coverMediaId ? (
                  <div className="w-full aspect-[4/3] bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                    <FolderOpen size={40} className="text-primary-400/70" />
                  </div>
                ) : (
                  <div className="w-full aspect-[4/3] bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
                    <FolderOpen size={40} className="text-primary-400/70" />
                  </div>
                )}
                {album.category && (
                  <span className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-primary-500/90 text-white text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full backdrop-blur-sm">
                    {CATEGORY_LABELS[album.category]}
                  </span>
                )}
              </div>
              <div className="p-3 sm:p-4">
                <h3 className="font-medium text-text-primary truncate text-sm sm:text-base">{album.name}</h3>
                <p className="text-xs sm:text-sm text-text-secondary mt-1">{album.mediaCount} 项媒体</p>
                {album.earliestDate && (
                  <p className="text-xs text-text-muted mt-1">
                    {album.earliestDate?.slice(0, 10)} ~ {album.latestDate?.slice(0, 10)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>
          <div className="bg-surface rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-large animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-lg sm:text-xl text-text-primary mb-6">创建相册</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">相册名称</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-400 transition"
                  placeholder="输入相册名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">分类</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Album['category'] }))}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-400 transition"
                >
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">描述</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-400 transition resize-none"
                  rows={3}
                  placeholder="简单描述这个相册"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-text-secondary hover:bg-surface-hover transition text-sm"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting || !form.name.trim()}
                className="px-5 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition disabled:opacity-50 text-sm font-medium"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
