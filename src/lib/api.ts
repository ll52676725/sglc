const BASE = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, options)
  const json = await res.json()
  if (!json.success) {
    throw new Error(json.error || '请求失败')
  }
  return json.data as T
}

export const api = {
  media: {
    upload: async (files: File[], albumId?: string, videoThumbnails?: Map<string, Blob>): Promise<any> => {
      const form = new FormData()
      files.forEach((f) => form.append('files', f))
      if (albumId) {
        form.append('albumId', albumId)
      }
      if (videoThumbnails) {
        videoThumbnails.forEach((blob, filename) => {
          form.append('thumbnails', blob, `thumb_${filename}.jpg`)
        })
      }
      return request('/media/upload', { method: 'POST', body: form })
    },
    list: (params?: Record<string, any>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return request<{ items: any[]; total: number; page: number; pageSize: number }>(`/media${qs}`)
    },
    get: (id: string) => request<any>(`/media/${id}`),
    update: (id: string, data: any) =>
      request<any>(`/media/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request<void>(`/media/${id}`, { method: 'DELETE' }),
  },
  albums: {
    list: () => request<any[]>('/albums'),
    get: (id: string) => request<any>(`/albums/${id}`),
    create: (data: any) =>
      request<any>('/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request<any>(`/albums/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request<void>(`/albums/${id}`, { method: 'DELETE' }),
    addMedia: (albumId: string, mediaIds: string[]) =>
      request<void>(`/albums/${albumId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaIds }),
      }),
    removeMedia: (albumId: string, mediaId: string) =>
      request<void>(`/albums/${albumId}/media/${mediaId}`, { method: 'DELETE' }),
  },
  biography: {
    list: () => request<any[]>('/biography'),
    get: (id: string) => request<any>(`/biography/${id}`),
    getWriters: () => request<Record<string, any[]>>('/biography/writers'),
    generate: (data: { startDate: string; endDate: string; style: string; language: string; writerId?: string; useLLM?: boolean }) =>
      request<any>('/biography/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    continue: (id: string, data: { startDate: string; endDate: string; writerId?: string }) =>
      request<any>(`/biography/${id}/continue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) =>
      request<any>(`/biography/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request<void>(`/biography/${id}`, { method: 'DELETE' }),
  },
  stats: {
    get: () => request<any>('/stats'),
  },
  ai: {
    classify: (albumId?: string) => request<any>(`/ai/classify/${albumId || 'all'}`),
  },
  moments: {
    list: (params?: Record<string, any>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return request<{ items: any[]; total: number; page: number; limit: number }>(`/moments${qs}`)
    },
    get: (id: string) => request<any>(`/moments/${id}`),
    create: async (data: {
      content: string
      mood?: string
      weather?: string
      location?: string
      happenedAt: string
      tags?: string[]
      existingMediaIds?: string[]
      files?: File[]
      videoThumbnails?: Map<string, Blob>
    }) => {
      const form = new FormData()
      form.append('content', data.content)
      if (data.mood) form.append('mood', data.mood)
      if (data.weather) form.append('weather', data.weather)
      if (data.location) form.append('location', data.location)
      form.append('happenedAt', data.happenedAt)
      if (data.tags && data.tags.length > 0) form.append('tags', JSON.stringify(data.tags))
      if (data.existingMediaIds && data.existingMediaIds.length > 0) form.append('existingMediaIds', JSON.stringify(data.existingMediaIds))
      if (data.files) {
        data.files.forEach((f) => form.append('files', f))
      }
      if (data.videoThumbnails) {
        data.videoThumbnails.forEach((blob, filename) => {
          form.append('thumbnails', blob, `thumb_${filename}.jpg`)
        })
      }
      return request('/moments', { method: 'POST', body: form })
    },
    update: (id: string, data: any) =>
      request<any>(`/moments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request<void>(`/moments/${id}`, { method: 'DELETE' }),
  },
}
