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
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true

    const url = URL.createObjectURL(file)
    video.src = url

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
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          URL.revokeObjectURL(url)
          reject(new Error('Failed to get canvas context'))
          return
        }

        const stream = canvas.captureStream(fps)
        const audioStream = await getAudioStream(file)
        if (audioStream) {
          audioStream.getAudioTracks().forEach(track => stream.addTrack(track))
        }

        const mimeTypes = [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm',
          'video/mp4',
        ]
        
        let selectedMimeType = ''
        for (const type of mimeTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            selectedMimeType = type
            break
          }
        }

        if (!selectedMimeType) {
          URL.revokeObjectURL(url)
          resolve(file)
          return
        }

        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: selectedMimeType,
          videoBitsPerSecond: targetBitrate,
        })

        const chunks: Blob[] = []
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data)
          }
        }

        mediaRecorder.onstop = () => {
          URL.revokeObjectURL(url)
          const blob = new Blob(chunks, { type: selectedMimeType })
          const ext = selectedMimeType.includes('webm') ? '.webm' : '.mp4'
          const newFileName = file.name.replace(/\.[^/.]+$/, '') + ext
          const compressedFile = new File([blob], newFileName, { type: selectedMimeType })
          resolve(compressedFile)
        }

        mediaRecorder.onerror = (e) => {
          URL.revokeObjectURL(url)
          reject(e)
        }

        video.currentTime = 0
        video.play()
        mediaRecorder.start()

        const duration = video.duration
        let lastTime = 0

        const drawFrame = () => {
          if (video.paused || video.ended) {
            mediaRecorder.stop()
            return
          }

          ctx.drawImage(video, 0, 0, width, height)

          const currentTime = video.currentTime
          if (onProgress && duration > 0) {
            const percent = Math.min(100, (currentTime / duration) * 100)
            if (currentTime - lastTime > 0.1) {
              onProgress(percent)
              lastTime = currentTime
            }
          }

          requestAnimationFrame(drawFrame)
        }

        drawFrame()
      } catch (err) {
        URL.revokeObjectURL(url)
        reject(err)
      }
    }

    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load video for compression'))
    }
  })
}

async function getAudioStream(file: File): Promise<MediaStream | null> {
  try {
    const url = URL.createObjectURL(file)
    const audioContext = new AudioContext()
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    
    const destination = audioContext.createMediaStreamDestination()
    const source = audioContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(destination)
    source.start(0)
    
    URL.revokeObjectURL(url)
    return destination.stream
  } catch (e) {
    return null
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
