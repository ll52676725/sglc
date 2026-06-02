import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Play, FolderOpen } from 'lucide-react'
import { api } from '@/lib/api'
import { CATEGORY_LABELS } from '@/types'
import type { Album, MediaItem } from '@/types'

export default function AlbumDetail() {
  const { albumId } = useParams<{ albumId: string }>()
  const navigate = useNavigate()
  const [album, setAlbum] = useState<Album | null>(null)
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!albumId) return
    setLoading(true)
    api.albums.get(albumId).then((data) => {
      setAlbum(data)
      setMedia(data.media || [])
    }).finally(() => setLoading(false))
  }, [albumId])

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
    <div className="min-h-screen p-6 md:p-8 fade-in">
      <Link
        to="/albums"
        className="inline-flex items-center gap-1.5 text-ink/60 hover:text-ink transition mb-6"
      >
        <ArrowLeft size={18} />
        返回相册
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="font-display text-2xl text-ink">{album.name}</h1>
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
      </div>

      {media.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-ink/60">
          <FolderOpen size={64} className="mb-4 text-gold-500/50" />
          <p className="text-lg">相册还是空的</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {media.map((item) => (
            <div
              key={item.id}
              onClick={() => navigate(`/media/${item.id}`)}
              className="aspect-square rounded-lg overflow-hidden bg-white/80 shadow-sm hover:shadow-md transition cursor-pointer group relative"
            >
              <img
                src={item.thumbnailUrl || item.url}
                alt={item.description || item.filename}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {item.type === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center bg-ink/20 opacity-0 group-hover:opacity-100 transition">
                  <Play size={32} className="text-white" fill="white" />
                </div>
              )}
            </div>
          ))}
          <div className="aspect-square rounded-lg border-2 border-dashed border-gold-300 flex items-center justify-center hover:border-gold-500 transition cursor-pointer group">
            <Plus size={28} className="text-gold-400 group-hover:text-gold-500 transition" />
          </div>
        </div>
      )}
    </div>
  )
}
