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
    <div className="min-h-screen p-6 md:p-8 fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl golden-underline">我的相册</h1>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/ai-classify')}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-5 py-2.5 rounded-xl hover:from-purple-600 hover:to-pink-600 transition font-medium shadow-md hover:shadow-lg"
          >
            <Sparkles size={18} />
            AI 智能分类
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-gold-500 text-white px-5 py-2.5 rounded-xl hover:bg-gold-600 transition font-medium"
          >
            <Plus size={18} />
            创建相册
          </button>
        </div>
      </div>

      {albums.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-ink/60">
          <FolderOpen size={64} className="mb-4 text-gold-500/50" />
          <p className="text-lg mb-6">还没有相册</p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-gold-500 text-white px-5 py-2.5 rounded-xl hover:bg-gold-600 transition font-medium"
          >
            <Plus size={18} />
            创建相册
          </button>
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-ivory rounded-2xl p-6 w-[480px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-xl mb-6">创建相册</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1">相册名称</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gold-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gold-500/40"
                  placeholder="输入相册名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink/70 mb-1">分类</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Album['category'] }))}
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
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gold-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gold-500/40 resize-none"
                  rows={3}
                  placeholder="简单描述这个相册"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-ink/70 hover:bg-ink/5 transition"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting || !form.name.trim()}
                className="px-5 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition disabled:opacity-50"
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
