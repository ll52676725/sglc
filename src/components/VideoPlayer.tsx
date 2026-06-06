import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import { Loader2, Settings, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VideoQuality {
  name: string
  url: string
  resolution: number
}

interface VideoPlayerProps {
  src: string
  hlsMasterUrl?: string
  qualities?: VideoQuality[]
  className?: string
  poster?: string
}

export default function VideoPlayer({
  src,
  hlsMasterUrl,
  qualities = [],
  className,
  poster,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [currentQuality, setCurrentQuality] = useState<string>('auto')
  const [error, setError] = useState<string | null>(null)
  const settingsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    setIsLoading(true)
    setError(null)

    const playUrl = hlsMasterUrl || src

    if (hlsMasterUrl && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      })
      hlsRef.current = hls

      hls.loadSource(hlsMasterUrl)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false)
      })

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.warn('HLS fatal error, falling back to original video:', data)
          hls.destroy()
          hlsRef.current = null
          video.src = src
        }
      })

      return () => {
        hls.destroy()
        hlsRef.current = null
      }
    } else {
      video.src = playUrl
      
      const handleCanPlay = () => setIsLoading(false)
      const handleError = () => {
        setIsLoading(false)
        setError('视频加载失败')
      }

      video.addEventListener('canplay', handleCanPlay)
      video.addEventListener('error', handleError)

      return () => {
        video.removeEventListener('canplay', handleCanPlay)
        video.removeEventListener('error', handleError)
      }
    }
  }, [src, hlsMasterUrl])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleQualityChange = (qualityName: string) => {
    setCurrentQuality(qualityName)
    setShowSettings(false)

    const video = videoRef.current
    if (!video) return

    if (qualityName === 'auto') {
      if (hlsMasterUrl && hlsRef.current) {
        hlsRef.current.currentLevel = -1
      } else if (hlsMasterUrl && Hls.isSupported()) {
        video.src = hlsMasterUrl
      }
    } else {
      const quality = qualities.find(q => q.name === qualityName)
      if (quality) {
        if (hlsRef.current) {
          const levelIndex = hlsRef.current.levels.findIndex(
            l => l.height === quality.resolution
          )
          if (levelIndex !== -1) {
            hlsRef.current.currentLevel = levelIndex
          }
        } else {
          video.src = quality.url
        }
      }
    }
  }

  return (
    <div className={cn('relative group', className)}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
          <p className="text-white/70 text-sm">{error}</p>
        </div>
      )}

      <video
        ref={videoRef}
        poster={poster}
        controls
        playsInline
        className="w-full h-full object-contain rounded-lg"
      />

      {hlsMasterUrl && qualities.length > 0 && (
        <div className="absolute top-3 right-3" ref={settingsRef}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-full bg-black/50 text-white/80 hover:bg-black/70 hover:text-white transition opacity-0 group-hover:opacity-100"
          >
            <Settings size={18} />
          </button>

          {showSettings && (
            <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-xl overflow-hidden z-10">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-xs font-medium text-gray-500">清晰度</p>
              </div>
              <div className="py-1">
                <button
                  onClick={() => handleQualityChange('auto')}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition',
                    currentQuality === 'auto' ? 'text-gold-600 font-medium bg-gold-50' : 'text-gray-700'
                  )}
                >
                  自动
                </button>
                {qualities.map((q) => (
                  <button
                    key={q.name}
                    onClick={() => handleQualityChange(q.name)}
                    className={cn(
                      'w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition',
                      currentQuality === q.name ? 'text-gold-600 font-medium bg-gold-50' : 'text-gray-700'
                    )}
                  >
                    {q.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
