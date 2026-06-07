import { useState, useEffect } from 'react';

export type ThemeType = 'vintage' | 'minimal' | 'tech' | 'nature';

export interface ThemeInfo {
  id: ThemeType;
  name: string;
  description: string;
  preview: string;
}

export const themes: ThemeInfo[] = [
  {
    id: 'vintage',
    name: '复古经典',
    description: '温暖的淡黄色调，怀旧优雅',
    preview: 'linear-gradient(135deg, #FFFFF0 0%, #FFE4C4 100%)'
  },
  {
    id: 'minimal',
    name: '现代极简',
    description: '清爽蓝白配色，简洁高效',
    preview: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)'
  },
  {
    id: 'tech',
    name: '深色科技',
    description: '暗色主题，紫蓝霓虹科技感',
    preview: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)'
  },
  {
    id: 'nature',
    name: '温馨自然',
    description: '清新绿棕配色，自然舒适',
    preview: 'linear-gradient(135deg, #FAFAF8 0%, #F0F7EE 100%)'
  }
];

export function useTheme() {
  const [theme, setTheme] = useState<ThemeType>(() => {
    const savedTheme = localStorage.getItem('app-theme') as ThemeType;
    if (savedTheme && themes.some(t => t.id === savedTheme)) {
      return savedTheme;
    }
    return 'minimal';
  });

  useEffect(() => {
    const root = document.documentElement;
    themes.forEach(t => {
      root.classList.remove(`theme-${t.id}`);
    });
    root.classList.add(`theme-${theme}`);
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const setThemeById = (themeId: ThemeType) => {
    if (themes.some(t => t.id === themeId)) {
      setTheme(themeId);
    }
  };

  const cycleTheme = () => {
    const currentIndex = themes.findIndex(t => t.id === theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex].id);
  };

  const currentThemeInfo = themes.find(t => t.id === theme)!;

  return {
    theme,
    themes,
    currentThemeInfo,
    setTheme: setThemeById,
    cycleTheme
  };
}