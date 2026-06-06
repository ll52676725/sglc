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

export interface CompressOptions {
  maxWidth?: number
  maxHeight?: number
  targetBitrate?: number
  fps?: number
  onProgress?: (percent: number) => void
}

export async function compressVideo(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const {
    maxWidth = 1280,
    maxHeight = 720,
    targetBitrate = 2500000,
    fps = 30,
    onProgress,
  } = options

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

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      cleanup()
      return file
    }

    const mimeTypes = [
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp8',
      'video/webm',
    ]
    
    let selectedMimeType = ''
    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        selectedMimeType = type
        break
      }
    }

    if (!selectedMimeType) {
      cleanup()
      return file
    }

    const stream = canvas.captureStream(fps)

    let mediaRecorder: MediaRecorder
    try {
      mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: targetBitrate,
      })
    } catch (e) {
      cleanup()
      return file
    }

    const chunks: Blob[] = []
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data)
      }
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
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop()
        }
      } catch (e) {}
      
      stream.getTracks().forEach(track => track.stop())
      cleanup?.()
    }

    mediaRecorder.onstop = () => {
      if (resolved) return
      
      try {
        if (chunks.length === 0) {
          finish(file)
          return
        }
        
        const blob = new Blob(chunks, { type: selectedMimeType })
        if (blob.size < 1000) {
          finish(file)
          return
        }
        
        const ext = selectedMimeType.includes('webm') ? '.webm' : '.mp4'
        const baseName = file.name.replace(/\.[^/.]+$/, '')
        const newFileName = baseName + ext
        const compressedFile = new File([blob], newFileName, { type: selectedMimeType })
        
        finish(compressedFile)
      } catch (e) {
        console.warn('Compression result error:', e)
        finish(file)
      }
    }

    mediaRecorder.onerror = (e) => {
      console.warn('MediaRecorder error:', e)
      finish(file)
    }

    video.playbackRate = 1.0
    
    try {
      await video.play()
    } catch (e) {
      console.warn('Video play failed:', e)
      cleanup()
      return file
    }

    try {
      mediaRecorder.start(250)
    } catch (e) {
      console.warn('MediaRecorder start failed:', e)
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
