import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateVideoThumbnail(file: File, seekTime = 1): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true

    const url = URL.createObjectURL(file)
    video.src = url

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(seekTime, video.duration * 0.1 || 0.5)
    }

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 360
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          URL.revokeObjectURL(url)
          reject(new Error('Failed to get canvas context'))
          return
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url)
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to create thumbnail blob'))
            }
          },
          'image/jpeg',
          0.8,
        )
      } catch (err) {
        URL.revokeObjectURL(url)
        reject(err)
      }
    }

    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load video for thumbnail generation'))
    }
  })
}

export type VideoCodec = 'vp8' | 'vp9' | 'h264'
export type VideoFormat = 'webm' | 'mp4'
export type CompressionQuality = 'low' | 'medium' | 'high' | 'original'

export interface CompressOptions {
  maxWidth?: number
  maxHeight?: number
  targetBitrate?: number
  fps?: number
  codec?: VideoCodec
  format?: VideoFormat
  quality?: CompressionQuality
  onProgress?: (percent: number) => void
}

export interface CompressionPreset {
  name: string
  label: string
  maxWidth: number
  maxHeight: number
  targetBitrate: number
  fps: number
  description: string
}

export const COMPRESSION_PRESETS: Record<CompressionQuality, CompressionPreset> = {
  low: {
    name: 'low',
    label: '低质量（小文件）',
    maxWidth: 640,
    maxHeight: 360,
    targetBitrate: 800000,
    fps: 24,
    description: '适合网络分享，文件最小'
  },
  medium: {
    name: 'medium',
    label: '中等质量（推荐）',
    maxWidth: 1280,
    maxHeight: 720,
    targetBitrate: 2500000,
    fps: 30,
    description: '平衡质量和文件大小'
  },
  high: {
    name: 'high',
    label: '高质量',
    maxWidth: 1920,
    maxHeight: 1080,
    targetBitrate: 5000000,
    fps: 30,
    description: '更清晰的画面，文件较大'
  },
  original: {
    name: 'original',
    label: '保持原画',
    maxWidth: 3840,
    maxHeight: 2160,
    targetBitrate: 8000000,
    fps: 60,
    description: '尽可能保持原始质量'
  }
}

export const VIDEO_CODECS: Array<{ value: VideoCodec; label: string; description: string }> = [
  { value: 'vp8', label: 'VP8', description: '兼容性好，压缩速度快' },
  { value: 'vp9', label: 'VP9', description: '压缩率高，文件更小' },
  { value: 'h264', label: 'H.264', description: '通用格式，兼容性最好' }
]

export const VIDEO_FORMATS: Array<{ value: VideoFormat; label: string; description: string }> = [
  { value: 'webm', label: 'WebM', description: '开源格式，VP8/VP9 编码' },
  { value: 'mp4', label: 'MP4', description: '通用格式，H.264 编码' }
]

function getMimeTypeVariants(codec: VideoCodec, format: VideoFormat): string[] {
  if (format === 'mp4') {
    return [
      'video/mp4;codecs=avc1.42E01E',
      'video/mp4;codecs=avc1',
      'video/mp4',
    ]
  }
  
  switch (codec) {
    case 'vp9':
      return [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp9,opus',
        'video/webm; codecs="vp9"',
        'video/webm; codecs="vp9, opus"',
      ]
    case 'vp8':
      return [
        'video/webm;codecs=vp8',
        'video/webm;codecs=vp8,opus',
        'video/webm; codecs="vp8"',
        'video/webm; codecs="vp8, opus"',
      ]
    default:
      return [
        'video/webm;codecs=vp8',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ]
  }
}

function getMimeTypeForCodec(codec: VideoCodec, format: VideoFormat): string {
  return getMimeTypeVariants(codec, format)[0]
}

function getSupportedMimeTypes(): string[] {
  const types: string[] = []
  const allCandidates = new Set<string>()
  
  const codecs: VideoCodec[] = ['vp9', 'vp8', 'h264']
  const formats: VideoFormat[] = ['webm', 'mp4']
  
  for (const codec of codecs) {
    for (const format of formats) {
      if (codec === 'h264' && format !== 'mp4') continue
      if (codec !== 'h264' && format === 'mp4') continue
      getMimeTypeVariants(codec, format).forEach(t => allCandidates.add(t))
    }
  }
  allCandidates.add('video/webm')
  allCandidates.add('video/mp4')
  
  for (const type of allCandidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      types.push(type)
    }
  }
  return types
}

export function getSupportedCodecs(): VideoCodec[] {
  const supported = getSupportedMimeTypes()
  const codecs: VideoCodec[] = []
  if (supported.some(t => t.includes('vp9'))) codecs.push('vp9')
  if (supported.some(t => t.includes('vp8'))) codecs.push('vp8')
  if (supported.some(t => t.includes('avc1') || t.includes('h264') || t.includes('mp4'))) codecs.push('h264')
  return codecs
}

export function getSupportedFormats(): VideoFormat[] {
  const supported = getSupportedMimeTypes()
  const formats: VideoFormat[] = []
  if (supported.some(t => t.includes('webm'))) formats.push('webm')
  if (supported.some(t => t.includes('mp4'))) formats.push('mp4')
  return formats
}

export async function compressVideo(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const {
    quality = 'medium',
    codec = 'vp8',
    format = 'webm',
    onProgress,
  } = options

  const preset = COMPRESSION_PRESETS[quality]
  let maxWidth = options.maxWidth ?? preset.maxWidth
  let maxHeight = options.maxHeight ?? preset.maxHeight
  let targetBitrate = options.targetBitrate ?? preset.targetBitrate
  let fps = options.fps ?? preset.fps

  if (codec === 'vp9') {
    targetBitrate = Math.max(targetBitrate, 1000000)
  }

  if (typeof MediaRecorder === 'undefined' || !file.type.startsWith('video/')) {
    return file
  }

  let cleanup: (() => void) | null = null
  let animationId: number | null = null

  try {
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true
    video.defaultMuted = true
    video.volume = 0

    const url = URL.createObjectURL(file)
    video.src = url

    cleanup = () => {
      if (animationId !== null) {
        cancelAnimationFrame(animationId)
        animationId = null
      }
      try {
        video.pause()
        video.src = ''
        video.removeAttribute('src')
        try { video.load() } catch (e) {}
      } catch (e) {}
      try { URL.revokeObjectURL(url) } catch (e) {}
    }

    await new Promise<void>((res, rej) => {
      const timer = setTimeout(() => rej(new Error('Video load timeout')), 15000)
      video.onloadedmetadata = () => {
        clearTimeout(timer)
        res()
      }
      video.onerror = () => {
        clearTimeout(timer)
        rej(new Error('Failed to load video'))
      }
    })

    let width = video.videoWidth
    let height = video.videoHeight

    if (!width || !height) {
      cleanup()
      return file
    }

    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height)
      width = Math.round(width * ratio)
      height = Math.round(height * ratio)
    }

    width = width % 2 === 0 ? width : width - 1
    height = height % 2 === 0 ? height : height - 1

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      cleanup()
      return file
    }

    video.playbackRate = 1.0
    
    try {
      await video.play()
      await new Promise(r => setTimeout(r, 200))
    } catch (e) {
      console.warn('[compressVideo] Video play failed:', e)
      cleanup()
      return file
    }

    try {
      ctx.drawImage(video, 0, 0, width, height)
      await new Promise(r => setTimeout(r, 100))
    } catch (e) {
      console.warn('[compressVideo] Initial frame draw failed:', e)
    }

    const codecVariants = getMimeTypeVariants(codec, format)
    const fallbackMimeTypes = [
      ...codecVariants,
      'video/webm;codecs=vp8',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4;codecs=avc1.42E01E',
      'video/mp4;codecs=avc1',
      'video/mp4',
    ]
    
    let selectedMimeType = ''
    for (const type of fallbackMimeTypes) {
      try {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type
          break
        }
      } catch (e) {
        continue
      }
    }

    if (!selectedMimeType) {
      cleanup()
      return file
    }

    const stream = canvas.captureStream(fps)

    let mediaRecorder: MediaRecorder | null = null
    let actualMimeType = selectedMimeType
    let actualTimeslice = 250
    
    const isVP9 = codec === 'vp9' || selectedMimeType.includes('vp9')
    if (isVP9) {
      actualTimeslice = 1000
      targetBitrate = Math.max(targetBitrate, 1500000)
    }
    
    const recorderConfigs = [
      { mimeType: selectedMimeType, videoBitsPerSecond: targetBitrate },
      { mimeType: selectedMimeType, videoBitsPerSecond: Math.max(targetBitrate * 0.8, 500000) },
      { mimeType: selectedMimeType, videoBitsPerSecond: Math.max(targetBitrate * 0.6, 300000) },
      { mimeType: selectedMimeType },
      ...fallbackMimeTypes.filter(t => t !== selectedMimeType && !t.includes('vp9')).map(t => ({ mimeType: t, videoBitsPerSecond: targetBitrate })),
      ...fallbackMimeTypes.filter(t => t !== selectedMimeType && !t.includes('vp9')).map(t => ({ mimeType: t })),
    ]

    let recorderCreated = false
    for (const config of recorderConfigs) {
      try {
        if (!MediaRecorder.isTypeSupported(config.mimeType)) {
          continue
        }
        console.log('[compressVideo] Trying MediaRecorder config:', config)
        mediaRecorder = new MediaRecorder(stream, config)
        actualMimeType = config.mimeType
        
        if (!config.mimeType.includes('vp9')) {
          actualTimeslice = 250
        }
        
        recorderCreated = true
        console.log('[compressVideo] MediaRecorder created successfully with:', actualMimeType)
        break
      } catch (e) {
        console.warn(`[compressVideo] Failed to create MediaRecorder with config ${JSON.stringify(config)}:`, e)
        continue
      }
    }

    if (!recorderCreated || !mediaRecorder) {
      console.warn('[compressVideo] No MediaRecorder config worked, using original file')
      cleanup()
      return file
    }

    const chunks: Blob[] = []
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data)
      }
    }
    
    mediaRecorder.onstart = () => {
      console.log('[compressVideo] MediaRecorder started successfully')
    }

    let resolved = false
    let finalFile = file

    const finish = (resultFile: File) => {
      if (resolved) return
      resolved = true
      finalFile = resultFile
      
      try {
        if (animationId !== null) {
          cancelAnimationFrame(animationId)
          animationId = null
        }
      } catch (e) {}
      
      try {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.stop()
        }
      } catch (e) {
        console.warn('[compressVideo] Error stopping MediaRecorder:', e)
      }
      
      stream.getTracks().forEach(track => track.stop())
      cleanup?.()
    }

    mediaRecorder.onstop = () => {
      if (resolved) return
      
      try {
        if (chunks.length === 0) {
          console.warn('[compressVideo] No data chunks received')
          finish(file)
          return
        }
        
        console.log(`[compressVideo] Received ${chunks.length} chunks, processing...`)
        const blob = new Blob(chunks, { type: actualMimeType })
        console.log(`[compressVideo] Final blob size: ${blob.size} bytes`)
        
        if (blob.size < 1000) {
          console.warn('[compressVideo] Blob too small, using original')
          finish(file)
          return
        }
        
        let ext = '.webm'
        if (actualMimeType.includes('mp4')) {
          ext = '.mp4'
        } else if (actualMimeType.includes('webm')) {
          ext = '.webm'
        }
        const baseName = file.name.replace(/\.[^/.]+$/, '')
        const newFileName = baseName + '_compressed' + ext
        const compressedFile = new File([blob], newFileName, { type: actualMimeType })
        
        finish(compressedFile)
      } catch (e) {
        console.warn('[compressVideo] Compression result error:', e)
        finish(file)
      }
    }

    mediaRecorder.onerror = (e) => {
      console.warn('[compressVideo] MediaRecorder error:', e)
      finish(file)
    }

    try {
      console.log('[compressVideo] Starting MediaRecorder with timeslice:', actualTimeslice)
      mediaRecorder.start(actualTimeslice)
    } catch (e) {
      console.warn('[compressVideo] MediaRecorder start failed:', e)
      cleanup()
      return file
    }

    const duration = video.duration || 0
    let lastProgressTime = 0
    let lastDrawTime = 0
    const frameInterval = 1000 / fps

    const drawFrame = (timestamp: number) => {
      if (resolved) return

      if (video.ended || video.paused || video.readyState < 2) {
        if (onProgress && duration > 0) {
          onProgress(100)
        }
        setTimeout(() => finish(finalFile), 600)
        return
      }

      if (timestamp - lastDrawTime >= frameInterval) {
        try {
          ctx.drawImage(video, 0, 0, width, height)
        } catch (e) {}
        lastDrawTime = timestamp
      }

      const currentTime = video.currentTime
      if (onProgress && duration > 0 && currentTime - lastProgressTime > 0.1) {
        const percent = Math.min(99, Math.floor((currentTime / duration) * 100))
        onProgress(percent)
        lastProgressTime = currentTime
      }

      animationId = requestAnimationFrame(drawFrame)
    }

    video.onended = () => {
      if (onProgress && duration > 0) {
        onProgress(100)
      }
      setTimeout(() => finish(finalFile), 800)
    }

    video.onerror = () => {
      finish(file)
    }

    animationId = requestAnimationFrame(drawFrame)

    const maxDuration = Math.max(120000, (duration || 30) * 3000)
    setTimeout(() => {
      if (!resolved) {
        console.warn('Compression timed out')
        finish(file)
      }
    }, maxDuration)

    await new Promise<File>((resolve) => {
      const checkInterval = setInterval(() => {
        if (resolved) {
          clearInterval(checkInterval)
          resolve(finalFile)
        }
      }, 100)
    })

    return finalFile
  } catch (err) {
    console.warn('Video compression failed:', err)
    cleanup?.()
    return file
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
