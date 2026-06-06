import { create } from 'zustand'
import type { MediaItem, Album, Biography, Stats, Moment } from '@/types'

interface AppState {
  media: MediaItem[]
  albums: Album[]
  biographies: Biography[]
  moments: Moment[]
  stats: Stats | null
  selectedYear: number | null
  selectedMonth: number | null
  loading: boolean
  showOnboarding: boolean
  onboardingStep: number

  setMedia: (media: MediaItem[]) => void
  addMedia: (items: MediaItem[]) => void
  updateMediaItem: (id: string, data: Partial<MediaItem>) => void
  removeMedia: (id: string) => void

  setAlbums: (albums: Album[]) => void
  addAlbum: (album: Album) => void
  updateAlbumItem: (id: string, data: Partial<Album>) => void
  removeAlbum: (id: string) => void

  setBiographies: (biographies: Biography[]) => void
  addBiography: (bio: Biography) => void
  updateBiographyItem: (id: string, data: Partial<Biography>) => void
  removeBiography: (id: string) => void

  setMoments: (moments: Moment[]) => void
  addMoment: (moment: Moment) => void
  updateMomentItem: (id: string, data: Partial<Moment>) => void
  removeMoment: (id: string) => void

  setStats: (stats: Stats) => void
  setSelectedYear: (year: number | null) => void
  setSelectedMonth: (month: number | null) => void
  setLoading: (loading: boolean) => void

  setShowOnboarding: (show: boolean) => void
  setOnboardingStep: (step: number) => void
  nextOnboardingStep: () => void
  prevOnboardingStep: () => void
  completeOnboarding: () => void
}

const getInitialOnboardingState = () => {
  if (typeof window !== 'undefined') {
    const completed = localStorage.getItem('onboarding_completed')
    return {
      showOnboarding: !completed,
      onboardingStep: 0,
    }
  }
  return {
    showOnboarding: false,
    onboardingStep: 0,
  }
}

export const useStore = create<AppState>((set) => ({
  media: [],
  albums: [],
  biographies: [],
  moments: [],
  stats: null,
  selectedYear: null,
  selectedMonth: null,
  loading: false,
  ...getInitialOnboardingState(),

  setMedia: (media) => set({ media }),
  addMedia: (items) => set((s) => ({ media: [...items, ...s.media] })),
  updateMediaItem: (id, data) =>
    set((s) => ({
      media: s.media.map((m) => (m.id === id ? { ...m, ...data } : m)),
    })),
  removeMedia: (id) =>
    set((s) => ({ media: s.media.filter((m) => m.id !== id) })),

  setAlbums: (albums) => set({ albums }),
  addAlbum: (album) => set((s) => ({ albums: [album, ...s.albums] })),
  updateAlbumItem: (id, data) =>
    set((s) => ({
      albums: s.albums.map((a) => (a.id === id ? { ...a, ...data } : a)),
    })),
  removeAlbum: (id) =>
    set((s) => ({ albums: s.albums.filter((a) => a.id !== id) })),

  setBiographies: (biographies) => set({ biographies }),
  addBiography: (bio) =>
    set((s) => ({ biographies: [bio, ...s.biographies] })),
  updateBiographyItem: (id, data) =>
    set((s) => ({
      biographies: s.biographies.map((b) =>
        b.id === id ? { ...b, ...data } : b
      ),
    })),
  removeBiography: (id) =>
    set((s) => ({ biographies: s.biographies.filter((b) => b.id !== id) })),

  setMoments: (moments) => set({ moments }),
  addMoment: (moment) => set((s) => ({ moments: [moment, ...s.moments] })),
  updateMomentItem: (id, data) =>
    set((s) => ({
      moments: s.moments.map((m) => (m.id === id ? { ...m, ...data } : m)),
    })),
  removeMoment: (id) =>
    set((s) => ({ moments: s.moments.filter((m) => m.id !== id) })),

  setStats: (stats) => set({ stats }),
  setSelectedYear: (year) => set({ selectedYear: year }),
  setSelectedMonth: (month) => set({ selectedMonth: month }),
  setLoading: (loading) => set({ loading }),

  setShowOnboarding: (show) => set({ showOnboarding: show }),
  setOnboardingStep: (step) => set({ onboardingStep: step }),
  nextOnboardingStep: () => set((s) => ({ onboardingStep: s.onboardingStep + 1 })),
  prevOnboardingStep: () => set((s) => ({ onboardingStep: Math.max(0, s.onboardingStep - 1) })),
  completeOnboarding: () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboarding_completed', 'true')
    }
    set({ showOnboarding: false, onboardingStep: 0 })
  },
}))
