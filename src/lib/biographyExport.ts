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

  const mediaBase64Map = new Map<string, string>()
  for (const [id, media] of mediaMap.entries()) {
    if (media.type === 'photo') {
      const base64 = await fetchImageAsBase64(media.url)
      mediaBase64Map.set(id, base64)
    }
  }

  const renderContainer = document.createElement('div')
  renderContainer.style.position = 'absolute'
  renderContainer.style.left = '-9999px'
  renderContainer.style.top = '-9999px'
  renderContainer.style.width = '794px'
  renderContainer.style.background = 'white'
  renderContainer.style.fontFamily = "'SimSun', 'Microsoft YaHei', serif"
  renderContainer.style.padding = '40px'
  renderContainer.style.boxSizing = 'border-box'

  const chaptersHtml = biography.chapters
    .map((chapter) => {
      const mediaHtml = (chapter.mediaIds || [])
        .filter((id) => {
          const media = mediaMap.get(id)
          return media && media.type === 'photo' && mediaBase64Map.has(id)
        })
        .map((id) => {
          const base64 = mediaBase64Map.get(id)
          const media = mediaMap.get(id)
          return `
            <div style="margin: 16px 0; text-align: center;">
              <img src="${base64}" style="max-width: 100%; max-height: 350px; border-radius: 8px;" />
              ${media?.description ? `<p style="font-size: 12px; color: #888; margin-top: 8px;">${media.description}</p>` : ''}
            </div>
          `
        })
        .join('')

      const paragraphs = chapter.content.split('\n').filter(p => p.trim()).map(p =>
        `<p style="font-size: 14px; line-height: 2; color: #333; text-indent: 2em; margin: 12px 0;">${p}</p>`
      ).join('')

      return `
        <div style="padding: 20px 0; border-bottom: 1px solid #f0f0f0;">
          <h2 style="font-size: 20px; color: #222; margin-bottom: 20px; font-weight: bold;">
            ${chapter.title}
          </h2>
          ${paragraphs}
          ${mediaHtml}
        </div>
      `
    })
    .join('')

  renderContainer.innerHTML = `
    <div style="text-align: center; padding: 80px 40px 120px; border-bottom: 1px solid #f0f0f0;">
      <div style="font-size: 72px; margin-bottom: 30px;">${STYLE_ICONS[biography.style] || '📖'}</div>
      <h1 style="font-size: 32px; color: #222; margin-bottom: 24px; font-weight: bold;">${biography.title}</h1>
      <p style="font-size: 16px; color: #666; margin-bottom: 8px;">${STYLE_LABELS[biography.style] || ''}</p>
      <p style="font-size: 16px; color: #666;">${formatDateRange(biography.startDate, biography.endDate)}</p>
    </div>
    ${chaptersHtml}
    <div style="text-align: center; padding: 60px 40px;">
      <p style="font-size: 14px; color: #999;">— 全文完 —</p>
    </div>
  `

  document.body.appendChild(renderContainer)

  try {
    await new Promise(resolve => setTimeout(resolve, 500))

    const canvas = await html2canvas(renderContainer, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    })

    document.body.removeChild(renderContainer)

    const imgWidth = 210
    const pageHeight = 297
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight
    let position = 0

    const pdf = new jsPDF('p', 'mm', 'a4')
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    pdf.save(`${biography.title}.pdf`)
  } catch (error) {
    document.body.removeChild(renderContainer)
    throw error
  }
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
