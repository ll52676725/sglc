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

  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = false
    video.playsInline = true
    video.crossOrigin = 'anonymous'

    const url = URL.createObjectURL(file)
    video.src = url

    const cleanup = () => {
      try {
        video.pause()
        video.src = ''
        video.load()
      } catch (e) {}
      URL.revokeObjectURL(url)
    }

    video.onloadedmetadata = async () => {
      try {
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
        const ctx = canvas.getContext('2d', { willReadFrequently: false })

        if (!ctx) {
          cleanup()
          resolve(file)
          return
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
          if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
            selectedMimeType = type
            break
          }
        }

        if (!selectedMimeType || typeof MediaRecorder === 'undefined') {
          cleanup()
          resolve(file)
          return
        }

        const videoStream = canvas.captureStream(fps)
        let finalStream = videoStream

        try {
          const videoEl = video as any
          if (videoEl.captureStream || videoEl.mozCaptureStream || videoEl.webkitCaptureStream) {
            const captureStream = videoEl.captureStream || videoEl.mozCaptureStream || videoEl.webkitCaptureStream
            const originalStream = captureStream.call(videoEl)
            const audioTracks = originalStream.getAudioTracks()
            if (audioTracks.length > 0) {
              audioTracks.forEach((track: any) => videoStream.addTrack(track))
            }
          }
        } catch (e) {
          console.log('Audio capture not available, proceeding without audio')
        }

        let mediaRecorder: MediaRecorder
        try {
          mediaRecorder = new MediaRecorder(finalStream, {
            mimeType: selectedMimeType,
            videoBitsPerSecond: targetBitrate,
            audioBitsPerSecond: 128000,
          })
        } catch (e) {
          try {
            mediaRecorder = new MediaRecorder(finalStream, {
              mimeType: selectedMimeType,
              videoBitsPerSecond: targetBitrate,
            })
          } catch (e2) {
            cleanup()
            resolve(file)
            return
          }
        }

        const chunks: Blob[] = []
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data)
          }
        }

        let stopped = false
        const stopRecording = () => {
          if (stopped) return
          stopped = true
          try {
            if (mediaRecorder.state !== 'inactive') {
              mediaRecorder.stop()
            }
          } catch (e) {}
        }

        mediaRecorder.onstop = () => {
          try {
            cleanup()
            if (chunks.length === 0) {
              resolve(file)
              return
            }
            const blob = new Blob(chunks, { type: selectedMimeType })
            if (blob.size === 0) {
              resolve(file)
              return
            }
            const ext = selectedMimeType.includes('webm') ? '.webm' : '.mp4'
            const newFileName = file.name.replace(/\.[^/.]+$/, '') + ext
            const compressedFile = new File([blob], newFileName, { type: selectedMimeType })
            resolve(compressedFile)
          } catch (e) {
            cleanup()
            resolve(file)
          }
        }

        mediaRecorder.onerror = (e) => {
          console.warn('MediaRecorder error:', e)
          stopRecording()
          cleanup()
          resolve(file)
        }

        try {
          await video.play()
        } catch (e) {
          console.warn('Video play failed:', e)
          cleanup()
          resolve(file)
          return
        }

        try {
          mediaRecorder.start(1000)
        } catch (e) {
          console.warn('MediaRecorder start failed:', e)
          cleanup()
          resolve(file)
          return
        }

        const duration = video.duration || 0
        let lastTime = 0

        const drawFrame = () => {
          if (stopped) return

          if (video.ended || video.paused) {
            if (onProgress && duration > 0) {
              onProgress(100)
            }
            setTimeout(stopRecording, 100)
            return
          }

          try {
            ctx.drawImage(video, 0, 0, width, height)
          } catch (e) {
            console.warn('Draw frame failed:', e)
          }

          const currentTime = video.currentTime
          if (onProgress && duration > 0) {
            const percent = Math.min(99, (currentTime / duration) * 100)
            if (currentTime - lastTime > 0.1 || percent >= 99) {
              onProgress(percent)
              lastTime = currentTime
            }
          }

          if (!stopped) {
            requestAnimationFrame(drawFrame)
          }
        }

        video.onended = () => {
          if (onProgress && duration > 0) {
            onProgress(100)
          }
          setTimeout(stopRecording, 200)
        }

        drawFrame()
      } catch (err) {
        console.warn('Video compression failed:', err)
        cleanup()
        resolve(file)
      }
    }

    video.onerror = () => {
      cleanup()
      resolve(file)
    }
  })
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
