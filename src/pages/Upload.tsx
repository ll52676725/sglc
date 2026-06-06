import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  CloudUpload, Check, FileImage, FileVideo, FolderOpen, Zap, 
  ArrowRight, Settings, ChevronDown, ChevronUp, Info, X, 
  Play, Upload as UploadIcon, Clock
} from 'lucide-react'
import { api } from '@/lib/api'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'
import { 
  generateVideoThumbnail, 
  compressVideo, 
  formatFileSize, 
  COMPRESSION_PRESETS, 
  VIDEO_CODECS, 
  VIDEO_FORMATS, 
  getSupportedCodecs, 
  getSupportedFormats, 
  type CompressionQuality, 
  type VideoCodec, 
  type VideoFormat 
} from '@/lib/utils'
import type { Album } from '@/types'
import { CATEGORY_LABELS } from '@/types'

interface SelectedFile {
  id: string
  file: File
  originalSize: number
  previewUrl?: string
}

interface UploadingFile {
  id: string
  file: File
  originalSize: number
  compressedSize?: number
  progress: number
  status: 'pending' | 'compressing' | 'uploading' | 'processing' | 'done' | 'error'
  statusText: string
  codec?: string
  format?: string
  quality?: string
}

export default function Upload() {
  const navigate = useNavigate()
  const { addMedia, albums, setAlbums, addMoment } = useStore()
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([])
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('')
  const [enableCompression, setEnableCompression] = useState(true)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [compressionQuality, setCompressionQuality] = useState<CompressionQuality>('medium')
  const [videoCodec, setVideoCodec] = useState<VideoCodec>('vp8')
  const [videoFormat, setVideoFormat] = useState<VideoFormat>('webm')
  const [supportedCodecs, setSupportedCodecs] = useState<VideoCodec[]>([])
  const [supportedFormats, setSupportedFormats] = useState<VideoFormat[]>([])
  const [syncToMoments, setSyncToMoments] = useState(false)
  const [momentContent, setMomentContent] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setSupportedCodecs(getSupportedCodecs())
    setSupportedFormats(getSupportedFormats())
  }, [])

  useEffect(() => {
    if (albums.length === 0) {
      api.albums.list().then(setAlbums)
    }
  }, [albums.length, setAlbums])

  useEffect(() => {
    return () => {
      selectedFiles.forEach(f => {
        if (f.previewUrl) {
          URL.revokeObjectURL(f.previewUrl)
        }
      })
    }
  }, [selectedFiles])

  const addFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    if (fileArray.length === 0) return

    const newFiles: SelectedFile[] = fileArray.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      originalSize: file.size,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }))

    setSelectedFiles(prev => [...prev, ...newFiles])
  }

  const removeFile = (id: string) => {
    setSelectedFiles(prev => {
      const file = prev.find(f => f.id === id)
      if (file?.previewUrl) {
        URL.revokeObjectURL(file.previewUrl)
      }
      return prev.filter(f => f.id !== id)
    })
  }

  const clearAllFiles = () => {
    selectedFiles.forEach(f => {
      if (f.previewUrl) {
        URL.revokeObjectURL(f.previewUrl)
      }
    })
    setSelectedFiles([])
  }

  const startUpload = async () => {
    if (selectedFiles.length === 0) return

    const initial: UploadingFile[] = selectedFiles.map((sf) => ({
      id: sf.id,
      file: sf.file,
      originalSize: sf.originalSize,
      progress: 0,
      status: 'pending',
      statusText: '等待中',
    }))

    setUploadingFiles(initial)
    setUploading(true)
    setSelectedFiles([])

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
                quality: compressionQuality,
                codec: videoCodec,
                format: videoFormat,
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
                          codec: videoCodec,
                          format: videoFormat,
                          quality: compressionQuality,
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
        videoThumbnails.size > 0 ? videoThumbnails : undefined,
        syncToMoments,
        momentContent
      )
      const items = (result.media || (Array.isArray(result) ? result : []))
      const createdMoment = result.moment

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

      if (createdMoment) {
        addMoment(createdMoment)
      }

      setUploadedUrls(items.map((m: any) => m.thumbnailUrl || m.url || ''))

      setTimeout(() => {
        if (selectedAlbumId) {
          navigate(`/albums/${selectedAlbumId}`)
        } else {
          navigate('/')
        }
      }, 2000)
    } catch (error) {
      console.error('Upload error:', error)
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.status === 'done' || f.status === 'processing'
            ? f
            : { ...f, progress: 100, status: 'error', statusText: '失败' }
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
    if (e.dataTransfer.files.length > 0 && !uploading) {
      addFiles(e.dataTransfer.files)
    }
  }

  const handleClick = () => {
    if (!uploading) {
      inputRef.current?.click()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files)
    }
    e.target.value = ''
  }

  const videoCount = selectedFiles.filter(f => f.file.type.startsWith('video/')).length
  const imageCount = selectedFiles.filter(f => f.file.type.startsWith('image/')).length

  return (
    <div className="min-h-screen fade-in">
      <h1 className="font-display text-3xl text-ink golden-underline inline-block mb-8">上传记忆</h1>

      {selectedFiles.length === 0 && uploadingFiles.length === 0 && (
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
      )}

      {selectedFiles.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-ink">
              待上传 ({selectedFiles.length} 个文件
              {imageCount > 0 && `，${imageCount} 张图片`}
              {videoCount > 0 && `，${videoCount} 个视频`}
              )
            </h2>
            <button
              onClick={clearAllFiles}
              className="text-sm text-ink/50 hover:text-red-500 transition flex items-center gap-1"
            >
              <X size={14} /> 清空全部
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {selectedFiles.map((sf) => (
              <div key={sf.id} className="relative rounded-lg overflow-hidden aspect-square bg-gold-100 group">
                {sf.previewUrl ? (
                  <img src={sf.previewUrl} alt="" className="w-full h-full object-cover" />
                ) : sf.file.type.startsWith('video/') ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="w-10 h-10 text-gold-400" />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileImage className="w-10 h-10 text-gold-400" />
                  </div>
                )}
                <div className="absolute top-1.5 right-1.5 flex gap-1">
                  <span className="bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                    {sf.file.type.startsWith('video/') ? '视频' : '图片'}
                  </span>
                </div>
                <button
                  onClick={() => removeFile(sf.id)}
                  className="absolute top-1.5 left-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                >
                  <X size={14} />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-white text-xs truncate">{sf.file.name}</p>
                  <p className="text-white/60 text-xs">{formatFileSize(sf.originalSize)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white/60 rounded-xl p-4 space-y-4">
            <div className="flex flex-wrap gap-6">
              {albums.length > 0 && (
                <div className="flex-1 min-w-[280px]">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gold-700 mb-2">
                    <FolderOpen size={14} /> 归入相册（可选）
                  </label>
                  <select
                    value={selectedAlbumId}
                    onChange={(e) => setSelectedAlbumId(e.target.value)}
                    className="w-full border border-gold-300 rounded-lg px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-gold-500/40 text-ink"
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

              <div className="flex-1 min-w-[280px]">
                <label className="flex items-center gap-1.5 text-sm font-medium text-gold-700 mb-2">
                  <Clock size={14} /> 同步到时光动态
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncToMoments}
                    onChange={(e) => setSyncToMoments(e.target.checked)}
                    className="w-4 h-4 text-gold-500 rounded border-gold-300 focus:ring-gold-500"
                  />
                  <span className="text-sm text-ink/70">上传后同步发布到时光动态</span>
                </label>
                {syncToMoments && (
                  <textarea
                    value={momentContent}
                    onChange={(e) => setMomentContent(e.target.value)}
                    placeholder="写下此刻的心情（可选）..."
                    rows={2}
                    className="w-full mt-2 border border-gold-200 rounded-lg px-3 py-2 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-gold-400 resize-none"
                  />
                )}
              </div>

              {videoCount > 0 && (
                <div className="flex-1 min-w-[280px]">
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
                    <span className="text-sm text-ink/70">上传前压缩视频（推荐）</span>
                  </label>
                  
                  {enableCompression && (
                    <button
                      type="button"
                      onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                      className="flex items-center gap-1.5 mt-2 text-sm text-gold-600 hover:text-gold-700 transition"
                    >
                      <Settings size={14} />
                      <span>压缩设置</span>
                      {showAdvancedSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}
                </div>
              )}
            </div>

            {videoCount > 0 && enableCompression && showAdvancedSettings && (
              <div className="p-4 bg-gold-50/50 rounded-xl border border-gold-200/50 space-y-4">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gold-700 mb-2">
                    压缩质量
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(Object.keys(COMPRESSION_PRESETS) as CompressionQuality[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setCompressionQuality(key)}
                        className={cn(
                          'px-3 py-2 rounded-lg text-sm transition border text-left',
                          compressionQuality === key
                            ? 'bg-gold-500 text-white border-gold-500'
                            : 'bg-white text-ink/70 border-gold-200 hover:border-gold-300'
                        )}
                      >
                        <div className="font-medium">{COMPRESSION_PRESETS[key].label}</div>
                        <div className={cn(
                          'text-xs mt-0.5',
                          compressionQuality === key ? 'text-white/70' : 'opacity-70'
                        )}>{COMPRESSION_PRESETS[key].description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-gold-700 mb-2">
                      编码格式
                    </label>
                    <select
                      value={videoCodec}
                      onChange={(e) => setVideoCodec(e.target.value as VideoCodec)}
                      className="w-full border border-gold-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gold-500/40 text-ink text-sm"
                    >
                      {VIDEO_CODECS.filter(c => supportedCodecs.includes(c.value)).map((codec) => (
                        <option key={codec.value} value={codec.value}>
                          {codec.label} - {codec.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-gold-700 mb-2">
                      输出格式
                    </label>
                    <select
                      value={videoFormat}
                      onChange={(e) => setVideoFormat(e.target.value as VideoFormat)}
                      className="w-full border border-gold-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-gold-500/40 text-ink text-sm"
                    >
                      {VIDEO_FORMATS.filter(f => supportedFormats.includes(f.value)).map((format) => (
                        <option key={format.value} value={format.value}>
                          {format.label} - {format.description}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                  <Info size={14} className="flex-shrink-0 mt-0.5" />
                  <p>
                    压缩后的视频将上传至服务器存储，您可以在相册或时间线中查看。
                    {compressionQuality !== 'original' && ' 压缩可显著减少上传时间和存储空间。'}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <div className="text-sm text-ink/50">
                共 {selectedFiles.length} 个文件，总大小约 {formatFileSize(selectedFiles.reduce((sum, f) => sum + f.originalSize, 0))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={clearAllFiles}
                  className="px-6 py-2.5 border border-gold-300 text-ink/70 rounded-xl hover:bg-gold-50 transition font-medium"
                >
                  取消
                </button>
                <button
                  onClick={startUpload}
                  disabled={uploading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gold-500 text-white rounded-xl hover:bg-gold-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UploadIcon size={18} /> 开始上传
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {uploadingFiles.length > 0 && (
        <div className="mt-8 space-y-3">
          <h2 className="font-display text-lg text-ink mb-4">上传进度</h2>
          {uploadingFiles.map((uf, idx) => (
            <div key={uf.id} className="flex items-center gap-3 bg-white/60 rounded-xl p-3">
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
                  <div className="space-y-1 mt-1">
                    <div className="flex items-center gap-1 text-xs text-ink/50">
                      <span>{formatFileSize(uf.originalSize)}</span>
                      <ArrowRight size={10} />
                      <span className="text-green-600 font-medium">{formatFileSize(uf.compressedSize)}</span>
                      <span className="text-green-600">
                        节省 {Math.round((1 - uf.compressedSize / uf.originalSize) * 100)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-ink/40">
                      {uf.codec && <span className="bg-gold-100 px-1.5 py-0.5 rounded">{uf.codec.toUpperCase()}</span>}
                      {uf.format && <span className="bg-gold-100 px-1.5 py-0.5 rounded">{uf.format.toUpperCase()}</span>}
                      {uf.quality && <span className="bg-parchment px-1.5 py-0.5 rounded">{COMPRESSION_PRESETS[uf.quality as CompressionQuality]?.label}</span>}
                    </div>
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
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="bg-green-500 rounded-full p-1.5 flex-shrink-0">
                <Check className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-green-800">上传成功！</h3>
                <p className="text-sm text-green-700 mt-1">
                  共上传 {uploadedUrls.filter(Boolean).length} 个文件，已保存到您的记忆库中。
                </p>
                <p className="text-sm text-green-600 mt-1">
                  📍 您可以在 <span className="font-medium">时间线</span> 或 
                  {selectedAlbumId ? (
                    <span className="font-medium">所选相册</span>
                  ) : (
                    <span className="font-medium">相册</span>
                  )} 中查看这些文件。
                </p>
                <p className="text-xs text-green-500 mt-2">
                  💡 视频文件已按您选择的设置压缩，可在详情页查看压缩信息。
                </p>
              </div>
            </div>
          </div>
          
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

      {selectedFiles.length === 0 && uploadingFiles.length === 0 && uploadedUrls.length === 0 && (
        <div className="mt-8 p-4 bg-gold-50/50 rounded-xl border border-gold-200/50">
          <p className="text-sm text-ink/50">支持 JPG、PNG、GIF、MP4、MOV 格式，单次最多 50 个文件</p>
          <p className="text-sm text-ink/50 mt-1">上传后可在照片详情中添加描述、人物标签和地点信息</p>
        </div>
      )}
    </div>
  )
}
