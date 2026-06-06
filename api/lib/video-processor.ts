import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs'
import path from 'path'
import { v4 } from 'uuid'

export interface VideoQuality {
  name: string
  resolution: number
  bitrate: string
  audioBitrate: string
}

export const VIDEO_QUALITIES: VideoQuality[] = [
  { name: '360p', resolution: 360, bitrate: '800k', audioBitrate: '96k' },
  { name: '720p', resolution: 720, bitrate: '2500k', audioBitrate: '128k' },
  { name: '1080p', resolution: 1080, bitrate: '5000k', audioBitrate: '192k' },
]

export interface VideoProcessingResult {
  success: boolean
  originalUrl?: string
  thumbnailUrl?: string
  hlsMasterUrl?: string
  qualities?: Array<{
    name: string
    url: string
    resolution: number
  }>
  duration?: number
  width?: number
  height?: number
  error?: string
}

export interface ProcessingStatus {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  message: string
  result?: VideoProcessingResult
  error?: string
}

const processingQueue = new Map<string, ProcessingStatus>()

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads')
const HLS_DIR = path.resolve(process.cwd(), 'uploads', 'hls')
const THUMBNAILS_DIR = path.resolve(process.cwd(), 'uploads', 'thumbnails')

function ensureDirs() {
  for (const dir of [UPLOADS_DIR, HLS_DIR, THUMBNAILS_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }
}

ensureDirs()

function getFfmpegAvailable(): boolean {
  try {
    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg'
    if (process.env.FFMPEG_PATH) {
      ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH)
    }
    return true
  } catch (e) {
    console.warn('[VideoProcessor] FFmpeg not available, video processing disabled')
    return false
  }
}

const FFMPEG_AVAILABLE = getFfmpegAvailable()

export function isFfmpegAvailable(): boolean {
  return FFMPEG_AVAILABLE
}

export function getProcessingStatus(id: string): ProcessingStatus | undefined {
  return processingQueue.get(id)
}

function updateProcessingStatus(id: string, updates: Partial<ProcessingStatus>) {
  const status = processingQueue.get(id)
  if (status) {
    Object.assign(status, updates)
    processingQueue.set(id, status)
  }
}

async function getVideoInfo(inputPath: string): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        reject(err)
        return
      }
      const videoStream = metadata.streams.find(s => s.codec_type === 'video')
      resolve({
        duration: metadata.format.duration || 0,
        width: videoStream?.width || 0,
        height: videoStream?.height || 0,
      })
    })
  })
}

async function generateThumbnail(inputPath: string, outputFilename: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(THUMBNAILS_DIR, outputFilename)
    ffmpeg(inputPath)
      .screenshots({
        timestamps: ['10%'],
        filename: outputFilename,
        folder: THUMBNAILS_DIR,
        size: '640x?',
      })
      .on('end', () => {
        resolve(`/uploads/thumbnails/${outputFilename}`)
      })
      .on('error', (err) => {
        reject(err)
      })
  })
}

async function transcodeToHls(
  inputPath: string,
  videoId: string,
  quality: VideoQuality,
  onProgress?: (percent: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputDir = path.join(HLS_DIR, videoId, quality.name)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const outputPath = path.join(outputDir, 'playlist.m3u8')
    let lastPercent = 0

    ffmpeg(inputPath)
      .outputOptions([
        '-profile:v', 'baseline',
        '-level', '3.0',
        '-start_number', '0',
        '-hls_time', '4',
        '-hls_list_size', '0',
        '-hls_segment_filename', path.join(outputDir, 'segment%d.ts'),
        '-vf', `scale=-2:${quality.resolution}`,
        '-b:v', quality.bitrate,
        '-maxrate', quality.bitrate,
        '-bufsize', quality.bitrate,
        '-b:a', quality.audioBitrate,
        '-ac', '2',
        '-ar', '44100',
      ])
      .output(outputPath)
      .on('progress', (progress) => {
        if (progress.percent !== undefined && onProgress) {
          const percent = Math.min(100, Math.max(0, progress.percent))
          if (percent - lastPercent > 1) {
            onProgress(percent)
            lastPercent = percent
          }
        }
      })
      .on('end', () => {
        resolve(`/uploads/hls/${videoId}/${quality.name}/playlist.m3u8`)
      })
      .on('error', (err) => {
        reject(err)
      })
      .run()
  })
}

function generateMasterPlaylist(
  videoId: string,
  qualities: Array<{ name: string; url: string; resolution: number; bitrate: string }>
): string {
  const masterDir = path.join(HLS_DIR, videoId)
  if (!fs.existsSync(masterDir)) {
    fs.mkdirSync(masterDir, { recursive: true })
  }

  const masterContent = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    ...qualities.map(q => 
      `#EXT-X-STREAM-INF:BANDWIDTH=${parseInt(q.bitrate) * 1000},RESOLUTION=?x${q.resolution}\n${q.name}/playlist.m3u8`
    ),
    '',
  ].join('\n')

  const masterPath = path.join(masterDir, 'master.m3u8')
  fs.writeFileSync(masterPath, masterContent)

  return `/uploads/hls/${videoId}/master.m3u8`
}

export async function processVideo(
  inputPath: string,
  originalFilename: string,
  options: {
    skipHls?: boolean
    skipThumbnail?: boolean
  } = {}
): Promise<VideoProcessingResult> {
  const processingId = v4()
  const { skipHls = false, skipThumbnail = false } = options

  processingQueue.set(processingId, {
    id: processingId,
    status: 'pending',
    progress: 0,
    message: '等待处理...',
  })

  if (!FFMPEG_AVAILABLE) {
    updateProcessingStatus(processingId, {
      status: 'completed',
      progress: 100,
      message: 'FFmpeg 不可用，跳过视频处理',
      result: {
        success: true,
      },
    })
    return { success: true }
  }

  try {
    updateProcessingStatus(processingId, {
      status: 'processing',
      progress: 5,
      message: '分析视频信息...',
    })

    const videoInfo = await getVideoInfo(inputPath)
    const videoId = path.basename(originalFilename, path.extname(originalFilename))

    let thumbnailUrl = ''
    if (!skipThumbnail) {
      updateProcessingStatus(processingId, {
        progress: 10,
        message: '生成缩略图...',
      })
      try {
        thumbnailUrl = await generateThumbnail(inputPath, `${videoId}.jpg`)
      } catch (e) {
        console.warn('[VideoProcessor] Failed to generate thumbnail:', e)
      }
    }

    const qualitiesResult: Array<{
      name: string
      url: string
      resolution: number
      bitrate: string
    }> = []

    if (!skipHls) {
      const applicableQualities = VIDEO_QUALITIES.filter(
        q => q.resolution <= videoInfo.height
      )

      if (applicableQualities.length === 0) {
        applicableQualities.push(VIDEO_QUALITIES[0])
      }

      const totalSteps = applicableQualities.length
      let currentStep = 0

      for (const quality of applicableQualities) {
        updateProcessingStatus(processingId, {
          progress: 20 + (currentStep / totalSteps) * 70,
          message: `转码中: ${quality.name}...`,
        })

        try {
          const url = await transcodeToHls(inputPath, videoId, quality, (percent) => {
            const stepProgress = (percent / 100) * (70 / totalSteps)
            const totalProgress = 20 + (currentStep / totalSteps) * 70 + stepProgress
            updateProcessingStatus(processingId, {
              progress: Math.min(95, totalProgress),
            })
          })
          qualitiesResult.push({
            name: quality.name,
            url,
            resolution: quality.resolution,
            bitrate: quality.bitrate,
          })
        } catch (e) {
          console.warn(`[VideoProcessor] Failed to transcode ${quality.name}:`, e)
        }

        currentStep++
      }
    }

    let hlsMasterUrl = ''
    if (qualitiesResult.length > 0) {
      hlsMasterUrl = generateMasterPlaylist(videoId, qualitiesResult)
    }

    updateProcessingStatus(processingId, {
      status: 'completed',
      progress: 100,
      message: '处理完成',
      result: {
        success: true,
        thumbnailUrl,
        hlsMasterUrl,
        qualities: qualitiesResult.map(q => ({
          name: q.name,
          url: q.url,
          resolution: q.resolution,
        })),
        duration: videoInfo.duration,
        width: videoInfo.width,
        height: videoInfo.height,
      },
    })

    return {
      success: true,
      thumbnailUrl,
      hlsMasterUrl,
      qualities: qualitiesResult.map(q => ({
        name: q.name,
        url: q.url,
        resolution: q.resolution,
      })),
      duration: videoInfo.duration,
      width: videoInfo.width,
      height: videoInfo.height,
    }
  } catch (error) {
    const errMsg = (error as Error).message
    updateProcessingStatus(processingId, {
      status: 'failed',
      progress: 0,
      message: '处理失败',
      error: errMsg,
    })
    return {
      success: false,
      error: errMsg,
    }
  }
}

export async function processVideoAsync(
  inputPath: string,
  originalFilename: string,
  options?: Parameters<typeof processVideo>[2]
): Promise<string> {
  const processingId = v4()
  
  processingQueue.set(processingId, {
    id: processingId,
    status: 'pending',
    progress: 0,
    message: '等待处理...',
  })

  process.nextTick(async () => {
    await processVideo(inputPath, originalFilename, options)
  })

  return processingId
}

setInterval(() => {
  const now = Date.now()
  const timeout = 2 * 60 * 60 * 1000
  for (const [id, status] of processingQueue) {
    if (status.status === 'completed' || status.status === 'failed') {
      processingQueue.delete(id)
    }
  }
}, 30 * 60 * 1000)
