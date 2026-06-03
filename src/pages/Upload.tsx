import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CloudUpload, Check, FileImage, FileVideo, FolderOpen } from 'lucide-react'
import { api } from '@/lib/api'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'
import { generateVideoThumbnail } from '@/lib/utils'
import type { Album } from '@/types'
import { CATEGORY_LABELS } from '@/types'

interface UploadingFile {
  file: File
  progress: number
  done: boolean
}

export default function Upload() {
  const navigate = useNavigate()
  const { addMedia, albums, setAlbums } = useStore()
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([])
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (albums.length === 0) {
      api.albums.list().then(setAlbums)
    }
  }, [albums.length, setAlbums])

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    if (fileArray.length === 0) return

    const initial: UploadingFile[] = fileArray.map((file) => ({
      file,
      progress: 0,
      done: false,
    }))
    setUploadingFiles(initial)
    setUploading(true)

    for (let i = 0; i < initial.length; i++) {
      setUploadingFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, progress: 30 } : f))
      )
    }

    try {
      const videoThumbnails = new Map<string, Blob>()
      const videoFiles = fileArray.filter(f => f.type.startsWith('video/'))
      
      if (videoFiles.length > 0) {
        setUploadingFiles((prev) =>
          prev.map((f) => f.file.type.startsWith('video/') ? { ...f, progress: 50 } : f)
        )
        
        const thumbnailPromises = videoFiles.map(async (vf) => {
          try {
            const blob = await generateVideoThumbnail(vf)
            videoThumbnails.set(vf.name, blob)
          } catch {}
        })
        await Promise.all(thumbnailPromises)
      }

      setUploadingFiles((prev) =>
        prev.map((f) => ({ ...f, progress: 70 }))
      )

      const result = await api.media.upload(fileArray, selectedAlbumId || undefined, videoThumbnails.size > 0 ? videoThumbnails : undefined)
      const items = Array.isArray(result) ? result : []

      setUploadingFiles((prev) =>
        prev.map((f) => ({ ...f, progress: 100, done: true }))
      )

      if (items.length > 0) {
        addMedia(items)
      }

      setUploadedUrls(items.map((m: any) => m.url || ''))

      setTimeout(() => {
        if (selectedAlbumId) {
          navigate(`/albums/${selectedAlbumId}`)
        } else {
          navigate('/')
        }
      }, 1500)
    } catch {
      setUploadingFiles((prev) =>
        prev.map((f) => ({ ...f, progress: 100, done: true }))
      )
    } finally {
      setUploading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }

  return (
    <div className="min-h-screen fade-in">
      <h1 className="font-display text-3xl text-ink golden-underline inline-block mb-8">上传记忆</h1>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={cn(
          'border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300',
          isDragging
            ? 'border-gold-500 bg-gold-50/30 scale-[1.01]'
            : 'border-gold-300 bg-white/40 hover:border-gold-400 hover:bg-white/50'
        )}
      >
        <CloudUpload className={cn('w-12 h-12 mx-auto mb-4', isDragging ? 'text-gold-500' : 'text-gold-400')} />
        <p className="text-lg text-ink/70 mb-1">拖拽照片和视频到这里</p>
        <p className="text-sm text-ink/40">或者点击选择文件</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {albums.length > 0 && (
        <div className="mt-6">
          <label className="flex items-center gap-1.5 text-sm font-medium text-gold-700 mb-2">
            <FolderOpen size={14} /> 归入相册（可选）
          </label>
          <select
            value={selectedAlbumId}
            onChange={(e) => setSelectedAlbumId(e.target.value)}
            className="w-full md:w-80 border border-gold-300 rounded-lg px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-gold-500/40 text-ink"
          >
            <option value="">不选择相册，仅上传到时间线</option>
            {albums.map((album) => (
              <option key={album.id} value={album.id}>
                {album.name} ({CATEGORY_LABELS[album.category]} - {album.mediaCount} 项)
              </option>
            ))}
          </select>
        </div>
      )}

      {uploadingFiles.length > 0 && (
        <div className="mt-8 space-y-3">
          <h2 className="font-display text-lg text-ink mb-4">上传进度</h2>
          {uploadingFiles.map((uf, idx) => (
            <div key={idx} className="flex items-center gap-3 bg-white/60 rounded-xl p-3">
              {uf.file.type.startsWith('video/') ? (
                <FileVideo className="w-5 h-5 text-gold-500 flex-shrink-0" />
              ) : (
                <FileImage className="w-5 h-5 text-gold-500 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink truncate">{uf.file.name}</p>
                <div className="mt-1 h-1.5 bg-gold-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gold-500 rounded-full transition-all duration-500"
                    style={{ width: `${uf.progress}%` }}
                  />
                </div>
              </div>
              {uf.done && <Check className="w-5 h-5 text-green-500 flex-shrink-0" />}
            </div>
          ))}
        </div>
      )}

      {uploadedUrls.length > 0 && !uploading && (
        <div className="mt-8">
          <h2 className="font-display text-lg text-ink mb-4">最近上传</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {uploadedUrls.filter(Boolean).map((url, idx) => (
              <div key={idx} className="relative rounded-lg overflow-hidden aspect-square bg-gold-100 group">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <div className="absolute top-1.5 right-1.5 bg-green-500 rounded-full p-0.5">
                  <Check className="w-3 h-3 text-white" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 p-4 bg-gold-50/50 rounded-xl border border-gold-200/50">
        <p className="text-sm text-ink/50">支持 JPG、PNG、GIF、MP4、MOV 格式，单次最多 50 个文件</p>
        <p className="text-sm text-ink/50 mt-1">上传后可在照片详情中添加描述、人物标签和地点信息</p>
      </div>
    </div>
  )
}
