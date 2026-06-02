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
    upload: async (files: File[]): Promise<any> => {
      const form = new FormData()
      files.forEach((f) => form.append('files', f))
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
    generate: (data: { startYear?: number; endYear?: number; style: string; language: string }) =>
      request<any>('/biography/generate', {
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
}
