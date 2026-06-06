import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ImageRun,
  AlignmentType,
  PageBreak,
  BorderStyle,
} from 'docx'
import { saveAs } from 'file-saver'
import type { Biography, BiographyChapter, MediaItem } from '@/types'
import { api } from './api'
import { STYLE_LABELS, STYLE_ICONS } from '@/types'

const fetchImageAsBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Failed to fetch image:', error)
    return ''
  }
}

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

const getMediaByIds = async (mediaIds: string[]): Promise<MediaItem[]> => {
  const mediaList: MediaItem[] = []
  for (const id of mediaIds) {
    try {
      const media = await api.media.get(id)
      mediaList.push(media)
    } catch (error) {
      console.error(`Failed to fetch media ${id}:`, error)
    }
  }
  return mediaList
}

const formatDateRange = (start: string, end: string) => {
  const s = new Date(start)
  const e = new Date(end)
  if (s.getFullYear() === e.getFullYear()) {
    return `${s.getFullYear()}年${s.getMonth() + 1}月${s.getDate()}日 - ${e.getMonth() + 1}月${e.getDate()}日`
  }
  return `${s.getFullYear()}年${s.getMonth() + 1}月 - ${e.getFullYear()}年${e.getMonth() + 1}月`
}

export const exportBiographyAsPDF = async (biography: Biography): Promise<void> => {
  const allMediaIds = biography.chapters.flatMap((c) => c.mediaIds || [])
  const mediaMap = new Map<string, MediaItem>()
  if (allMediaIds.length > 0) {
    const mediaList = await getMediaByIds(allMediaIds)
    mediaList.forEach((m) => mediaMap.set(m.id, m))
  }

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    throw new Error('无法打开打印窗口，请检查浏览器弹窗设置')
  }

  const mediaBase64Map = new Map<string, string>()
  for (const [id, media] of mediaMap.entries()) {
    if (media.type === 'photo') {
      const base64 = await fetchImageAsBase64(media.url)
      mediaBase64Map.set(id, base64)
    }
  }

  const chaptersHtml = biography.chapters
    .map((chapter, idx) => {
      const mediaHtml = (chapter.mediaIds || [])
        .filter((id) => {
          const media = mediaMap.get(id)
          return media && media.type === 'photo' && mediaBase64Map.has(id)
        })
        .map((id) => {
          const base64 = mediaBase64Map.get(id)
          return `<div style="margin: 10px 5px; display: inline-block;"><img src="${base64}" style="max-width: 200px; max-height: 150px; border-radius: 8px;" /></div>`
        })
        .join('')

      return `
        <div style="page-break-after: ${idx < biography.chapters.length - 1 ? 'always' : 'auto'}; padding: 20px;">
          <h2 style="font-size: 20px; color: #333; margin-bottom: 20px; font-family: 'SimSun', serif;">
            ${chapter.title}
          </h2>
          <div style="font-size: 14px; line-height: 2; color: #444; white-space: pre-wrap; font-family: 'SimSun', serif; text-indent: 2em;">
            ${chapter.content}
          </div>
          ${mediaHtml ? `<div style="margin-top: 20px;">${mediaHtml}</div>` : ''}
        </div>
      `
    })
    .join('')

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${biography.title}</title>
      <style>
        body {
          font-family: 'SimSun', 'Microsoft YaHei', serif;
          margin: 0;
          padding: 40px;
          background: white;
        }
        .cover {
          text-align: center;
          padding: 100px 40px;
          page-break-after: always;
        }
        .cover h1 {
          font-size: 36px;
          color: #333;
          margin-bottom: 30px;
        }
        .cover .meta {
          font-size: 16px;
          color: #666;
          margin-bottom: 10px;
        }
        .cover .icon {
          font-size: 64px;
          margin-bottom: 30px;
        }
      </style>
    </head>
    <body>
      <div class="cover">
        <div class="icon">${STYLE_ICONS[biography.style] || '📖'}</div>
        <h1>${biography.title}</h1>
        <div class="meta">${STYLE_LABELS[biography.style] || ''}</div>
        <div class="meta">${formatDateRange(biography.startDate, biography.endDate)}</div>
      </div>
      ${chaptersHtml}
    </body>
    </html>
  `

  printWindow.document.write(htmlContent)
  printWindow.document.close()

  await new Promise((resolve) => {
    printWindow.onload = resolve
    setTimeout(resolve, 1000)
  })

  printWindow.print()
}

export const exportBiographyAsWord = async (biography: Biography): Promise<void> => {
  const allMediaIds = biography.chapters.flatMap((c) => c.mediaIds || [])
  const mediaMap = new Map<string, MediaItem>()
  if (allMediaIds.length > 0) {
    const mediaList = await getMediaByIds(allMediaIds)
    mediaList.forEach((m) => mediaMap.set(m.id, m))
  }

  const children: any[] = []

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 4000, after: 400 },
      children: [new TextRun({ text: STYLE_ICONS[biography.style] || '📖', size: 72 })],
    }),
  )

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 400 },
      children: [
        new TextRun({
          text: biography.title,
          bold: true,
          size: 48,
          font: '宋体',
        }),
      ],
    }),
  )

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 200 },
      children: [
        new TextRun({
          text: STYLE_LABELS[biography.style] || '',
          size: 24,
          font: '宋体',
          color: '666666',
        }),
      ],
    }),
  )

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 4000 },
      children: [
        new TextRun({
          text: formatDateRange(biography.startDate, biography.endDate),
          size: 24,
          font: '宋体',
          color: '666666',
        }),
      ],
    }),
  )

  children.push(new PageBreak())

  for (let i = 0; i < biography.chapters.length; i++) {
    const chapter = biography.chapters[i]

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 400 },
        children: [
          new TextRun({
            text: chapter.title,
            bold: true,
            size: 32,
            font: '宋体',
          }),
        ],
      }),
    )

    const paragraphs = chapter.content.split('\n')
    for (const para of paragraphs) {
      if (para.trim()) {
        children.push(
          new Paragraph({
            spacing: { before: 200, after: 200, line: 360 },
            indent: { firstLine: 480 },
            children: [
              new TextRun({
                text: para,
                size: 24,
                font: '宋体',
              }),
            ],
          }),
        )
      }
    }

    const photoMediaIds = (chapter.mediaIds || []).filter((id) => {
      const media = mediaMap.get(id)
      return media && media.type === 'photo'
    })

    for (const mediaId of photoMediaIds) {
      const media = mediaMap.get(mediaId)
      if (media) {
        try {
          const base64 = await fetchImageAsBase64(media.url)
          if (base64) {
            const img = await loadImage(base64)
            const maxWidth = 500
            const maxHeight = 400
            let width = img.width
            let height = img.height
            const ratio = Math.min(maxWidth / width, maxHeight / height)
            if (ratio < 1) {
              width = width * ratio
              height = height * ratio
            }

            const imageBuffer = Uint8Array.from(atob(base64.split(',')[1]), c => c.charCodeAt(0))
            children.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 400, after: 400 },
                children: [
                  // @ts-ignore
                  new ImageRun({
                    data: imageBuffer,
                    transformation: {
                      width: width / 96 * 1.2,
                      height: height / 96 * 1.2,
                    },
                  }),
                ],
              }),
            )

            if (media.description) {
              children.push(
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 100, after: 200 },
                  children: [
                    new TextRun({
                      text: media.description,
                      size: 20,
                      font: '宋体',
                      color: '888888',
                    }),
                  ],
                }),
              )
            }
          }
        } catch (error) {
          console.error(`Failed to add image ${mediaId}:`, error)
        }
      }
    }

    if (i < biography.chapters.length - 1) {
      children.push(new PageBreak())
    }
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 4000, after: 400 },
      children: [
        new TextRun({
          text: '— 全文完 —',
          size: 24,
          font: '宋体',
          color: '888888',
        }),
      ],
    }),
  )

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children,
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `${biography.title}.docx`)
}
