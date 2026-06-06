import { useState, useRef, useEffect } from 'react'
import {
  X,
  Image,
  Video,
  Mic,
  Smile,
  MapPin,
  CloudSun,
  Tag,
  Send,
  Clock,
  Plus,
  Trash2,
  Play,
  Square,
  Pause,
} from 'lucide-react'
import { api } from '@/lib/api'
import type { Moment, MomentMedia } from '@/types'
import { MOOD_OPTIONS, WEATHER_OPTIONS } from '@/types'
import { cn } from '@/lib/utils'

interface ComposeMomentProps {
  onClose: () => void
  onSuccess: (moment: Moment) => void
}

export default function ComposeMoment({ onClose, onSuccess }: ComposeMomentProps) {
  const [content, setContent] = useState('')
  const [mood, setMood] = useState('')
  const [weather, setWeather] = useState('')
  const [location, setLocation] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [happenedAt, setHappenedAt] = useState(() => {
    const now = new Date()
    return now.toISOString().slice(0, 16)
  })
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<{ url: string; type: 'photo' | 'video' | 'audio'; duration?: number }[]>([])
  const [videoThumbnails, setVideoThumbnails] = useState<Map<string, Blob>>(new Map())
  const [showMoodPicker, setShowMoodPicker] = useState(false)
  const [showWeatherPicker, setShowWeatherPicker] = useState(false)
  const [showTagInput, setShowTagInput] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const MAX_RECORDING_DURATION = 60
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([])
  const [recordingError, setRecordingError] = useState('')

  const photoInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingTimerRef = useRef<number | null>(null)

  const generateVideoThumbnail = (file: File): Promise<{ url: string; thumbnailBlob: Blob }> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.src = URL.createObjectURL(file)
      video.crossOrigin = 'anonymous'
      video.muted = true
      video.preload = 'metadata'

      video.onloadeddata = () => {
        video.currentTime = 1
      }

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            canvas.toBlob((blob) => {
              if (blob) {
                resolve({ url: URL.createObjectURL(blob), thumbnailBlob: blob })
              } else {
                resolve({ url: URL.createObjectURL(file), thumbnailBlob: new Blob() })
              }
              URL.revokeObjectURL(video.src)
            }, 'image/jpeg', 0.8)
          } else {
            resolve({ url: URL.createObjectURL(file), thumbnailBlob: new Blob() })
            URL.revokeObjectURL(video.src)
          }
        } catch (e) {
          resolve({ url: URL.createObjectURL(file), thumbnailBlob: new Blob() })
          URL.revokeObjectURL(video.src)
        }
      }

      video.onerror = () => {
        resolve({ url: URL.createObjectURL(file), thumbnailBlob: new Blob() })
        URL.revokeObjectURL(video.src)
      }

      setTimeout(() => {
        if (video.readyState < 2) {
          resolve({ url: URL.createObjectURL(file), thumbnailBlob: new Blob() })
          URL.revokeObjectURL(video.src)
        }
      }, 5000)
    })
  }

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const remaining = 9 - selectedFiles.length
    const toAdd = files.slice(0, remaining)
    if (toAdd.length === 0) return

    setSelectedFiles(prev => [...prev, ...toAdd])

    const newPreviews = toAdd.map(f => ({
      url: URL.createObjectURL(f),
      type: f.type.startsWith('video/') ? 'video' as const : 'photo' as const,
    }))
    setPreviewUrls(prev => [...prev, ...newPreviews])

    if (e.target) e.target.value = ''
  }

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const remaining = 9 - selectedFiles.length
    const toAdd = files.slice(0, remaining)
    if (toAdd.length === 0) return

    setSelectedFiles(prev => [...prev, ...toAdd])

    const newThumbnails = new Map(videoThumbnails)
    for (const file of toAdd) {
      try {
        const { url, thumbnailBlob } = await generateVideoThumbnail(file)
        newThumbnails.set(file.name, thumbnailBlob)
        setPreviewUrls(prev => [...prev, { url, type: 'video' }])
      } catch {
        setPreviewUrls(prev => [...prev, { url: URL.createObjectURL(file), type: 'video' }])
      }
    }
    setVideoThumbnails(newThumbnails)

    if (e.target) e.target.value = ''
  }

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = document.createElement('audio')
      audio.src = URL.createObjectURL(file)
      audio.preload = 'metadata'

      audio.onloadedmetadata = () => {
        resolve(audio.duration)
        URL.revokeObjectURL(audio.src)
      }

      audio.onerror = () => {
        resolve(0)
        URL.revokeObjectURL(audio.src)
      }
    })
  }

  const handleAudioSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const remaining = 9 - selectedFiles.length
    const toAdd = files.slice(0, remaining)
    if (toAdd.length === 0) return

    const validFiles: File[] = []
    const invalidNames: string[] = []

    for (const file of toAdd) {
      try {
        const duration = await getAudioDuration(file)
        if (duration > MAX_RECORDING_DURATION) {
          invalidNames.push(file.name)
          continue
        }
        validFiles.push(file)
        setPreviewUrls(prev => [...prev, { url: URL.createObjectURL(file), type: 'audio', duration }])
      } catch {
        validFiles.push(file)
        setPreviewUrls(prev => [...prev, { url: URL.createObjectURL(file), type: 'audio' }])
      }
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles])
    }

    if (invalidNames.length > 0) {
      setRecordingError(`以下音频文件超过 ${MAX_RECORDING_DURATION} 秒限制，已跳过：${invalidNames.join('、')}`)
      setTimeout(() => setRecordingError(''), 5000)
    }

    if (e.target) e.target.value = ''
  }

  const recordedChunksRef = useRef<Blob[]>([])

  const startRecording = async () => {
    try {
      setRecordingError('')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      recordedChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setRecordedChunks([])
      setIsRecording(true)
      setRecordingTime(0)

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime(prev => {
          if (prev + 1 >= MAX_RECORDING_DURATION) {
            setTimeout(stopRecording, 100)
          }
          return prev + 1
        })
      }, 1000)

    } catch (err: any) {
      setRecordingError(err.message || '无法访问麦克风，请检查权限设置')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }

      setTimeout(() => {
        if (recordedChunksRef.current.length > 0) {
          const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' })
          const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' })

          setSelectedFiles(prev => [...prev, file])
          setPreviewUrls(prev => [...prev, { url: URL.createObjectURL(blob), type: 'audio', duration: recordingTime }])
        }
        setIsRecording(false)
        setRecordingTime(0)
      }, 100)
    }
  }

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop()
      }
    }
  }, [isRecording])

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previewUrls[index].url)
    const file = selectedFiles[index]
    const newThumbnails = new Map(videoThumbnails)
    newThumbnails.delete(file.name)
    setVideoThumbnails(newThumbnails)
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    setPreviewUrls(prev => prev.filter((_, i) => i !== index))
  }

  const addTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags(prev => [...prev, trimmed])
    }
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag))
  }

  const handleSubmit = async () => {
    if (!content.trim() && selectedFiles.length === 0) {
      setError('请输入内容或添加媒体文件')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const happenedAtISO = new Date(happenedAt).toISOString()
      const result = await api.moments.create({
        content: content.trim(),
        mood,
        weather,
        location,
        happenedAt: happenedAtISO,
        tags,
        files: selectedFiles.length > 0 ? selectedFiles : undefined,
        videoThumbnails: videoThumbnails.size > 0 ? videoThumbnails : undefined,
      })
      onSuccess(result as Moment)
    } catch (err: any) {
      setError(err.message || '发布失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = (content.trim() || selectedFiles.length > 0) && !submitting

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-gradient-to-b from-ivory to-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gold-200/60">
        <div className="sticky top-0 bg-ivory/95 backdrop-blur-sm z-10 px-5 py-4 border-b border-gold-100/60 flex items-center justify-between">
          <h2 className="font-display text-xl text-ink">记录此刻</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gold-100 text-ink/40 hover:text-ink/60 transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="此刻的心情、想法、发生的事..."
            className="w-full min-h-[120px] bg-transparent text-ink/85 text-[15px] leading-relaxed placeholder:text-ink/30 resize-none focus:outline-none"
            autoFocus
          />

          {previewUrls.length > 0 && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {previewUrls.map((preview, i) => (
                  <div key={i} className="relative rounded-lg overflow-hidden bg-gold-50 group">
                    {preview.type === 'audio' ? (
                      <div className="aspect-square flex flex-col items-center justify-center bg-gradient-to-br from-gold-100 to-gold-200/50 p-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-gold-500 to-gold-600 flex items-center justify-center mb-1 shadow-md">
                          <Play size={18} className="text-white ml-0.5" fill="white" />
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-gold-700">
                          <Mic size={10} />
                          <span>
                            {preview.duration
                              ? `${Math.floor(preview.duration / 60)}:${Math.floor(preview.duration % 60).toString().padStart(2, '0')}`
                              : '语音'
                            }
                          </span>
                        </div>
                        <div className="absolute top-1 left-1 bg-gold-600/80 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1">
                          <Mic size={10} /> 语音
                        </div>
                      </div>
                    ) : preview.type === 'video' ? (
                      <div className="relative aspect-square w-full">
                        <img src={preview.url} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center">
                            <Play size={20} className="text-white ml-0.5" fill="white" />
                          </div>
                        </div>
                        <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1">
                          <Video size={10} /> 视频
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-square">
                        <img src={preview.url} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <button
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition z-10"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {previewUrls.length < 9 && (
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    className="aspect-square rounded-lg border-2 border-dashed border-gold-300/60 flex flex-col items-center justify-center text-gold-400 hover:bg-gold-50 hover:text-gold-500 transition"
                  >
                    <Plus size={20} />
                    <span className="text-[10px] mt-0.5">添加</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <input
            ref={photoInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handlePhotoSelect}
            className="hidden"
          />
          <input
            ref={videoInputRef}
            type="file"
            multiple
            accept="video/*"
            onChange={handleVideoSelect}
            className="hidden"
          />
          <input
            ref={audioInputRef}
            type="file"
            multiple
            accept="audio/*"
            onChange={handleAudioSelect}
            className="hidden"
          />

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <button
                onClick={() => { setShowMoodPicker(!showMoodPicker); setShowWeatherPicker(false); setShowTagInput(false) }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition',
                  mood ? 'bg-gold-100 text-gold-700' : 'bg-gold-50 text-ink/50 hover:bg-gold-100'
                )}
              >
                <Smile size={14} />
                {mood ? `${getMoodEmoji(mood)} ${MOOD_OPTIONS.find(m => m.value === mood)?.label}` : '心情'}
              </button>
              {showMoodPicker && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMoodPicker(false)} />
                  <div className="absolute top-10 left-0 bg-white rounded-xl shadow-xl border border-gold-200/60 p-3 z-20 w-64">
                    <div className="grid grid-cols-3 gap-1.5">
                      {MOOD_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => { setMood(mood === opt.value ? '' : opt.value); setShowMoodPicker(false) }}
                          className={cn(
                            'flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm transition',
                            mood === opt.value ? 'bg-gold-100 text-gold-700' : 'hover:bg-gold-50'
                          )}
                        >
                          <span>{opt.emoji}</span>
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => { setShowWeatherPicker(!showWeatherPicker); setShowMoodPicker(false); setShowTagInput(false) }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition',
                  weather ? 'bg-blue-50 text-blue-600' : 'bg-gold-50 text-ink/50 hover:bg-gold-100'
                )}
              >
                <CloudSun size={14} />
                {weather ? `${getWeatherEmoji(weather)} ${WEATHER_OPTIONS.find(w => w.value === weather)?.label}` : '天气'}
              </button>
              {showWeatherPicker && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowWeatherPicker(false)} />
                  <div className="absolute top-10 left-0 bg-white rounded-xl shadow-xl border border-gold-200/60 p-3 z-20 w-56">
                    <div className="grid grid-cols-2 gap-1.5">
                      {WEATHER_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => { setWeather(weather === opt.value ? '' : opt.value); setShowWeatherPicker(false) }}
                          className={cn(
                            'flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm transition',
                            weather === opt.value ? 'bg-blue-50 text-blue-600' : 'hover:bg-gold-50'
                          )}
                        >
                          <span>{opt.emoji}</span>
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => { setShowTagInput(!showTagInput); setShowMoodPicker(false); setShowWeatherPicker(false) }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition',
                tags.length > 0 ? 'bg-purple-50 text-purple-600' : 'bg-gold-50 text-ink/50 hover:bg-gold-100'
              )}
            >
              <Tag size={14} />
              {tags.length > 0 ? `${tags.length} 个标签` : '标签'}
            </button>

            <button
              onClick={() => photoInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-gold-50 text-ink/50 hover:bg-gold-100 transition"
            >
              <Image size={14} />
              照片
            </button>

            <button
              onClick={() => videoInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-gold-50 text-ink/50 hover:bg-gold-100 transition"
            >
              <Video size={14} />
              视频
            </button>

            <div className="relative">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition',
                  isRecording
                    ? 'bg-red-500 text-white'
                    : 'bg-gold-50 text-ink/50 hover:bg-gold-100'
                )}
              >
                {isRecording ? (
                  <>
                    <Square size={14} fill="currentColor" className={recordingTime >= MAX_RECORDING_DURATION - 10 ? 'animate-pulse' : ''} />
                    录音中 {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}/{MAX_RECORDING_DURATION}s
                  </>
                ) : (
                  <>
                    <Mic size={14} />
                    语音
                  </>
                )}
              </button>
              {isRecording && recordingTime >= MAX_RECORDING_DURATION - 10 && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  即将达到最大时长
                </div>
              )}
            </div>

            <button
              onClick={() => audioInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-gold-50 text-ink/50 hover:bg-gold-100 transition"
            >
              <Mic size={14} />
              音频文件
            </button>
          </div>

          {showTagInput && (
            <div className="bg-gold-50/50 rounded-xl p-3 space-y-2">
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 text-xs text-gold-600 bg-gold-100/60 px-2.5 py-1 rounded-full">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="text-gold-400 hover:text-gold-600">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                  placeholder="输入标签后按回车..."
                  className="flex-1 bg-white border border-gold-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30"
                />
                <button
                  onClick={addTag}
                  disabled={!tagInput.trim()}
                  className="px-3 py-1.5 bg-gold-500 text-white rounded-lg text-sm hover:bg-gold-600 disabled:opacity-40 transition"
                >
                  添加
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <MapPin size={14} className="text-ink/40" />
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="添加位置"
                className="flex-1 bg-transparent text-sm text-ink/70 placeholder:text-ink/30 focus:outline-none border-b border-gold-200/60 pb-1"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock size={14} className="text-ink/40" />
            <input
              type="datetime-local"
              value={happenedAt}
              onChange={(e) => setHappenedAt(e.target.value)}
              className="flex-1 bg-transparent text-sm text-ink/70 focus:outline-none border-b border-gold-200/60 pb-1"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
          {recordingError && (
            <p className="text-red-500 text-sm">{recordingError}</p>
          )}
        </div>

        <div className="sticky bottom-0 bg-ivory/95 backdrop-blur-sm px-5 py-4 border-t border-gold-100/60 flex items-center justify-between">
          <span className="text-xs text-ink/40">
            {content.length > 0 && `${content.length} 字`}
            {selectedFiles.length > 0 && ` · ${selectedFiles.length} 个文件`}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-ink/50 hover:text-ink/70 transition"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={cn(
                'flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all',
                canSubmit
                  ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-white shadow-md shadow-gold-500/30 hover:shadow-lg active:scale-95'
                  : 'bg-gold-100 text-gold-300 cursor-not-allowed'
              )}
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={14} />
              )}
              {submitting ? '发布中...' : '发布'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function getMoodEmoji(mood: string) {
  const found = MOOD_OPTIONS.find(m => m.value === mood)
  return found ? found.emoji : ''
}

function getWeatherEmoji(weather: string) {
  const found = WEATHER_OPTIONS.find(w => w.value === weather)
  return found ? found.emoji : ''
}
