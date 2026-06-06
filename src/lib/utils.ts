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

  if (typeof MediaRecorder === 'undefined') {
    return file
  }

  let cleanup: (() => void) | null = null

  try {
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true
    video.defaultMuted = true

    const url = URL.createObjectURL(file)
    video.src = url

    cleanup = () => {
      try {
        video.pause()
        video.src = ''
        video.removeAttribute('src')
        video.load()
      } catch (e) {}
      try {
        URL.revokeObjectURL(url)
      } catch (e) {}
    }

    await new Promise<void>((res, rej) => {
      video.onloadedmetadata = () => res()
      video.onerror = () => rej(new Error('Failed to load video'))
    })

    let width = video.videoWidth
    let height = video.videoHeight

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
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9',
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
    const resultPromise = new Promise<File>((resolve) => {
      mediaRecorder.onstop = () => {
        if (resolved) return
        resolved = true
        
        try {
          if (chunks.length === 0) {
            cleanup?.()
            resolve(file)
            return
          }
          
          const blob = new Blob(chunks, { type: selectedMimeType })
          if (blob.size < 1000) {
            cleanup?.()
            resolve(file)
            return
          }
          
          const ext = selectedMimeType.includes('webm') ? '.webm' : '.mp4'
          const baseName = file.name.replace(/\.[^/.]+$/, '')
          const newFileName = baseName + ext
          const compressedFile = new File([blob], newFileName, { type: selectedMimeType })
          
          cleanup?.()
          resolve(compressedFile)
        } catch (e) {
          console.warn('Compression result error:', e)
          cleanup?.()
          resolve(file)
        }
      }
    })

    mediaRecorder.onerror = (e) => {
      console.warn('MediaRecorder error:', e)
      if (!resolved) {
        resolved = true
        try {
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop()
          }
        } catch (e2) {}
        cleanup?.()
      }
    }

    video.playbackRate = 1.0
    await video.play()

    mediaRecorder.start(500)

    const duration = video.duration || 0
    let animationId: number
    let lastProgressTime = 0

    const drawFrame = () => {
      if (resolved) return

      if (video.ended || video.paused) {
        if (onProgress && duration > 0) {
          onProgress(100)
        }
        try {
          if (mediaRecorder.state === 'recording') {
            setTimeout(() => {
              try {
                if (mediaRecorder.state === 'recording') {
                  mediaRecorder.stop()
                }
              } catch (e) {}
            }, 300)
          }
        } catch (e) {}
        return
      }

      try {
        ctx.drawImage(video, 0, 0, width, height)
      } catch (e) {}

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
      setTimeout(() => {
        try {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop()
          }
        } catch (e) {}
      }, 500)
    }

    animationId = requestAnimationFrame(drawFrame)

    const timeoutPromise = new Promise<File>((_, reject) => {
      setTimeout(() => reject(new Error('Compression timeout')), Math.max(60000, (duration || 10) * 2000))
    })

    return await Promise.race([resultPromise, timeoutPromise.catch(() => {
      resolved = true
      try {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop()
        }
      } catch (e) {}
      cancelAnimationFrame(animationId)
      cleanup?.()
      return file
    })])
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
