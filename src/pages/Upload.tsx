import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CloudUpload, Check, FileImage, FileVideo, FolderOpen, Zap, ArrowRight } from 'lucide-react'
import { api } from '@/lib/api'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'
import { generateVideoThumbnail, compressVideo, formatFileSize } from '@/lib/utils'
import type { Album } from '@/types'
import { CATEGORY_LABELS } from '@/types'

interface UploadingFile {
  file: File
  originalSize: number
  compressedSize?: number
  progress: number
  status: 'pending' | 'compressing' | 'uploading' | 'processing' | 'done' | 'error'
  statusText: string
}

export default function Upload() {
  const navigate = useNavigate()
  const { addMedia, albums, setAlbums } = useStore()
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([])
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('')
  const [enableCompression, setEnableCompression] = useState(true)
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
      originalSize: file.size,
      progress: 0,
      status: 'pending',
      statusText: '等待中',
    }))
    setUploadingFiles(initial)
    setUploading(true)

    try {
      const processedFiles: File[] = []
      const videoThumbnails = new Map<string, Blob>()

      for (let i = 0; i < initial.length; i++) {
        const item = initial[i]
        const file = item.file

        if (file.type.startsWith('video/')) {
          setUploadingFiles((prev) =>
            prev.map((f, idx) =>
              idx === i
                ? { ...f, status: 'compressing', statusText: '压缩中...' }
                : f
            )
          )

          let useOriginal = false
          let finalFile = file

          try {
            const thumbnailBlob = await generateVideoThumbnail(file)
            videoThumbnails.set(file.name, thumbnailBlob)
          } catch (e) {
            console.warn('Thumbnail generation failed:', e)
          }

          if (enableCompression) {
            try {
              const compressedFile = await compressVideo(file, {
                maxWidth: 1280,
                maxHeight: 720,
                targetBitrate: 2500000,
                onProgress: (percent) => {
                  setUploadingFiles((prev) =>
                    prev.map((f, idx) =>
                      idx === i
                        ? { ...f, progress: Math.floor(percent * 0.4) }
                        : f
                    )
                  )
                },
              })
              
              if (compressedFile.size > 0 && compressedFile.size < file.size * 1.5) {
                finalFile = compressedFile
                setUploadingFiles((prev) =>
                  prev.map((f, idx) =>
                    idx === i
                      ? {
                          ...f,
                          compressedSize: compressedFile.size,
                          progress: 40,
                          status: 'uploading',
                          statusText: '上传中...',
                        }
                      : f
                  )
                )
              } else {
                useOriginal = true
              }
            } catch (e) {
              console.warn('Video compression failed, using original:', e)
              useOriginal = true
            }
          } else {
            useOriginal = true
          }

          if (useOriginal) {
            setUploadingFiles((prev) =>
              prev.map((f, idx) =>
                idx === i
                  ? { ...f, progress: 40, status: 'uploading', statusText: '上传中...' }
                  : f
              )
            )
          }

          processedFiles.push(finalFile)
        } else {
          processedFiles.push(file)
          setUploadingFiles((prev) =>
            prev.map((f, idx) =>
              idx === i
                ? { ...f, progress: 40, status: 'uploading', statusText: '上传中...' }
                : f
            )
          )
        }
      }

      setUploadingFiles((prev) =>
        prev.map((f) => ({ ...f, progress: 70, statusText: '上传中...' }))
      )

      const result = await api.media.upload(
        processedFiles,
        selectedAlbumId || undefined,
        videoThumbnails.size > 0 ? videoThumbnails : undefined
      )
      const items = Array.isArray(result) ? result : []

      setUploadingFiles((prev) =>
        prev.map((f, idx) => {
          const item = items[idx]
          const isVideo = f.file.type.startsWith('video/')
          if (isVideo && item?.processingStatus === 'processing') {
            return {
              ...f,
              progress: 85,
              status: 'processing',
              statusText: '转码中...',
            }
          }
          return { ...f, progress: 100, status: 'done', statusText: '完成' }
        })
      )

      if (items.length > 0) {
        addMedia(items)
      }

      setUploadedUrls(items.map((m: any) => m.thumbnailUrl || m.url || ''))

      setTimeout(() => {
        if (selectedAlbumId) {
          navigate(`/albums/${selectedAlbumId}`)
        } else {
          navigate('/')
        }
      }, 2000)
    } catch {
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.status === 'done' ? f : { ...f, progress: 100, status: 'error', statusText: '失败' }
        )
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

      <div className="mt-6 flex flex-wrap gap-6">
        {albums.length > 0 && (
          <div>
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

        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gold-700 mb-2">
            <Zap size={14} /> 视频智能压缩
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enableCompression}
              onChange={(e) => setEnableCompression(e.target.checked)}
              className="w-4 h-4 text-gold-500 rounded border-gold-300 focus:ring-gold-500"
            />
            <span className="text-sm text-ink/70">上传前自动压缩视频（推荐）</span>
          </label>
        </div>
      </div>

      {uploadingFiles.length > 0 && (
        <div className="mt-8 space-y-3">
          <h2 className="font-display text-lg text-ink mb-4">上传进度</h2>
          {uploadingFiles.map((uf, idx) => (
            <div key={idx} className="flex items-center gap-3 bg-white/60 rounded-xl p-3">
              {uf.file.type.startsWith('video/') ? (
                <FileVideo className={cn(
                  'w-5 h-5 flex-shrink-0',
                  uf.status === 'error' ? 'text-red-500' : 'text-gold-500'
                )} />
              ) : (
                <FileImage className={cn(
                  'w-5 h-5 flex-shrink-0',
                  uf.status === 'error' ? 'text-red-500' : 'text-gold-500'
                )} />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-ink truncate">{uf.file.name}</p>
                  <span className={cn(
                    'text-xs flex-shrink-0 px-2 py-0.5 rounded-full',
                    uf.status === 'done' ? 'bg-green-100 text-green-700' :
                    uf.status === 'error' ? 'bg-red-100 text-red-700' :
                    uf.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                    'bg-gold-100 text-gold-700'
                  )}>
                    {uf.statusText}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-gold-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        uf.status === 'error' ? 'bg-red-500' : 'bg-gold-500'
                      )}
                      style={{ width: `${uf.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-ink/40 w-12 text-right">
                    {uf.progress}%
                  </span>
                </div>
                {uf.file.type.startsWith('video/') && uf.compressedSize && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-ink/50">
                    <span>{formatFileSize(uf.originalSize)}</span>
                    <ArrowRight size={10} />
                    <span className="text-green-600 font-medium">{formatFileSize(uf.compressedSize)}</span>
                    <span className="text-green-600">
                      节省 {Math.round((1 - uf.compressedSize / uf.originalSize) * 100)}%
                    </span>
                  </div>
                )}
              </div>
              {uf.status === 'done' && <Check className="w-5 h-5 text-green-500 flex-shrink-0" />}
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
