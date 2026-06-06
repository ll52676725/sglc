import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen, Trash2, Download, Edit3, Save, Loader2, Sparkles,
  Calendar, ChevronDown, X, Image, Clock, Feather,
  Scroll, Star, RefreshCw, PenTool
} from 'lucide-react'
import { api } from '@/lib/api'
import { useStore } from '@/store/useStore'
import type { Biography, BiographyChapter, WriterStyle } from '@/types'
import { STYLE_LABELS, STYLE_DESCRIPTIONS, STYLE_ICONS } from '@/types'
import { cn } from '@/lib/utils'

export default function BiographyPage() {
  const navigate = useNavigate()
  const { biographies, addBiography, removeBiography, updateBiographyItem, setBiographies } = useStore()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [currentBio, setCurrentBio] = useState<Biography | null>(null)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [style, setStyle] = useState<string>('modern')
  const [writerId, setWriterId] = useState<string>('')
  const [writers, setWriters] = useState<Record<string, WriterStyle[]>>({})
  const [showStyleDropdown, setShowStyleDropdown] = useState(false)
  const [showWriterDropdown, setShowWriterDropdown] = useState(false)
  const [language] = useState<string>('zh')
  const [generating, setGenerating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [error, setError] = useState('')
  const [showContinueModal, setShowContinueModal] = useState(false)
  const [continueStartDate, setContinueStartDate] = useState<string>('')
  const [continueEndDate, setContinueEndDate] = useState<string>('')
  const [continuing, setContinuing] = useState(false)

  useEffect(() => {
    api.biography.list().then(setBiographies).catch(() => {})
    api.biography.getWriters().then(setWriters).catch(() => {})
  }, [setBiographies])

  useEffect(() => {
    if (!selectedId) {
      setCurrentBio(null)
      return
    }
    api.biography.get(selectedId).then((bio) => {
      setCurrentBio(bio)
      setEditContent(bio.chapters.map((c: BiographyChapter) => c.content).join('\n\n---\n\n'))
    }).catch(() => {})
  }, [selectedId])

  useEffect(() => {
    const now = new Date()
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
    setEndDate(now.toISOString().slice(0, 10))
    setStartDate(threeMonthsAgo.toISOString().slice(0, 10))
  }, [])

  useEffect(() => {
    setWriterId('')
  }, [style])

  const getCurrentWriters = (): WriterStyle[] => {
    return writers[style] || []
  }

  const getWriterName = (id: string): string => {
    const allWriters = Object.values(writers).flat()
    const writer = allWriters.find(w => w.id === id)
    return writer?.name || ''
  }

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      setError('请选择起止日期')
      return
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError('开始日期不能晚于结束日期')
      return
    }

    setGenerating(true)
    setError('')
    try {
      const bio = await api.biography.generate({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate + 'T23:59:59').toISOString(),
        style,
        language,
        writerId: writerId || undefined,
        useLLM: true,
      })
      addBiography(bio)
      setSelectedId(bio.id)
    } catch (err: any) {
      setError(err.message || '生成失败，请重试')
    } finally {
      setGenerating(false)
    }
  }

  const handleContinue = async () => {
    if (!currentBio || !continueStartDate || !continueEndDate) {
      setError('请选择续写的起止日期')
      return
    }
    if (new Date(continueStartDate) > new Date(continueEndDate)) {
      setError('开始日期不能晚于结束日期')
      return
    }

    setContinuing(true)
    setError('')
    try {
      const bio = await api.biography.continue(currentBio.id, {
        startDate: new Date(continueStartDate).toISOString(),
        endDate: new Date(continueEndDate + 'T23:59:59').toISOString(),
        writerId: writerId || currentBio.writerId || undefined,
      })
      updateBiographyItem(currentBio.id, bio)
      setCurrentBio(bio)
      setShowContinueModal(false)
    } catch (err: any) {
      setError(err.message || '续写失败，请重试')
    } finally {
      setContinuing(false)
    }
  }

  const openContinueModal = () => {
    if (!currentBio) return
    const endDate = new Date(currentBio.endDate)
    const nextMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 1)
    const now = new Date()
    setContinueStartDate(nextMonth.toISOString().slice(0, 10))
    setContinueEndDate(now.toISOString().slice(0, 10))
    setShowContinueModal(true)
  }

  const handleSelect = (id: string) => {
    setSelectedId(id)
    setEditing(false)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.biography.delete(id)
      removeBiography(id)
      if (selectedId === id) {
        setSelectedId(null)
        setCurrentBio(null)
      }
    } catch {}
  }

  const handleSave = async () => {
    if (!currentBio) return
    try {
      const chapters = currentBio.chapters.map((c, i) => ({
        ...c,
        content: editContent.split('\n\n---\n\n')[i] ?? c.content,
      }))
      await api.biography.update(currentBio.id, {
        title: currentBio.title,
        style: currentBio.style,
        language: currentBio.language,
        chapters,
        startDate: currentBio.startDate,
        endDate: currentBio.endDate,
      })
      updateBiographyItem(currentBio.id, { chapters })
      setCurrentBio({ ...currentBio, chapters })
      setEditing(false)
    } catch {}
  }

  const formatDateRange = (start: string, end: string) => {
    const s = new Date(start)
    const e = new Date(end)
    if (s.getFullYear() === e.getFullYear()) {
      return `${s.getFullYear()}年${s.getMonth() + 1}月${s.getDate()}日 - ${e.getMonth() + 1}月${e.getDate()}日`
    }
    return `${s.getFullYear()}年${s.getMonth() + 1}月 - ${e.getFullYear()}年${e.getMonth() + 1}月`
  }

  const getMomentCount = (chapters: BiographyChapter[]) => {
    return chapters.reduce((sum, c) => sum + (c.momentIds?.length || 0), 0)
  }

  const getChapterDecorator = (style: string, index: number) => {
    if (style === 'wuxia') {
      return <Scroll className="w-5 h-5 text-gold-500" />
    }
    if (style === 'romance') {
      return <Heart className="w-5 h-5 text-rose-400" />
    }
    if (style === 'fantasy') {
      return <Star className="w-5 h-5 text-purple-500" />
    }
    if (style === 'poetic') {
      return <Feather className="w-5 h-5 text-teal-500" />
    }
    return <BookOpen className="w-5 h-5 text-gold-500" />
  }

  return (
    <div className="flex min-h-screen -m-8">
      <aside className="w-80 flex-shrink-0 bg-parchment/40 border-r border-gold-200 overflow-y-auto p-6 sticky top-0 h-screen">
        <h1 className="font-display text-2xl text-ink golden-underline inline-block mb-6">传记工坊</h1>

        <div className="space-y-4 mb-8">
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm text-ink/60">
              <Calendar size={14} />
              时间范围
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 rounded-lg border border-gold-200 bg-ivory/60 px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:border-gold-400"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 rounded-lg border border-gold-200 bg-ivory/60 px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:border-gold-400"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm text-ink/60">
              <Sparkles size={14} />
              传记风格
            </label>
            <div className="relative">
              <button
                onClick={() => setShowStyleDropdown(!showStyleDropdown)}
                className="w-full flex items-center justify-between rounded-lg border border-gold-200 bg-ivory/60 px-3 py-2 text-sm text-ink hover:bg-ivory transition"
              >
                <span className="flex items-center gap-2">
                  <span>{STYLE_ICONS[style]}</span>
                  <span>{STYLE_LABELS[style]}</span>
                </span>
                <ChevronDown size={16} className={cn('transition-transform', showStyleDropdown && 'rotate-180')} />
              </button>
              {showStyleDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowStyleDropdown(false)} />
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gold-200/60 z-20 max-h-80 overflow-y-auto">
                    {Object.entries(STYLE_LABELS).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => { setStyle(key); setShowStyleDropdown(false) }}
                        className={cn(
                          'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-gold-100 last:border-b-0',
                          style === key ? 'bg-gold-50 text-gold-700' : 'hover:bg-gold-50/50 text-ink/70'
                        )}
                      >
                        <span className="text-2xl">{STYLE_ICONS[key]}</span>
                        <div className="flex-1">
                          <p className="font-medium">{label}</p>
                          <p className="text-xs text-ink/40 mt-0.5">{STYLE_DESCRIPTIONS[key]}</p>
                        </div>
                        {style === key && (
                          <div className="w-2 h-2 rounded-full bg-gold-500 mt-2" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {getCurrentWriters().length > 0 && (
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-sm text-ink/60">
                <PenTool size={14} />
                参考作家
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowWriterDropdown(!showWriterDropdown)}
                  className="w-full flex items-center justify-between rounded-lg border border-gold-200 bg-ivory/60 px-3 py-2 text-sm text-ink hover:bg-ivory transition"
                >
                  <span className="flex items-center gap-2">
                    <PenTool size={14} className="text-gold-500" />
                    <span>{writerId ? getWriterName(writerId) : '随机选择'}</span>
                  </span>
                  <ChevronDown size={16} className={cn('transition-transform', showWriterDropdown && 'rotate-180')} />
                </button>
                {showWriterDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowWriterDropdown(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gold-200/60 z-20 max-h-60 overflow-y-auto">
                      <button
                        onClick={() => { setWriterId(''); setShowWriterDropdown(false) }}
                        className={cn(
                          'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-gold-100',
                          !writerId ? 'bg-gold-50 text-gold-700' : 'hover:bg-gold-50/50 text-ink/70'
                        )}
                      >
                        <span className="text-xl">🎲</span>
                        <div className="flex-1">
                          <p className="font-medium">随机选择</p>
                          <p className="text-xs text-ink/40 mt-0.5">系统自动选择一位作家</p>
                        </div>
                        {!writerId && (
                          <div className="w-2 h-2 rounded-full bg-gold-500 mt-2" />
                        )}
                      </button>
                      {getCurrentWriters().map((writer) => (
                        <button
                          key={writer.id}
                          onClick={() => { setWriterId(writer.id); setShowWriterDropdown(false) }}
                          className={cn(
                            'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-gold-100 last:border-b-0',
                            writerId === writer.id ? 'bg-gold-50 text-gold-700' : 'hover:bg-gold-50/50 text-ink/70'
                          )}
                        >
                          <span className="text-xl">✍️</span>
                          <div className="flex-1">
                            <p className="font-medium">{writer.name}</p>
                            <p className="text-xs text-ink/40 mt-0.5">{writer.description}</p>
                          </div>
                          {writerId === writer.id && (
                            <div className="w-2 h-2 rounded-full bg-gold-500 mt-2" />
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 py-3 text-white font-medium transition-all hover:shadow-lg hover:shadow-gold-500/30 active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {generating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Feather className="w-5 h-5" />
            )}
            {generating ? '正在创作...' : '开始创作'}
          </button>
        </div>

        <div className="border-t border-gold-200 pt-4">
          <h2 className="font-display text-lg text-ink/70 mb-3">我的传记</h2>
          <div className="space-y-2">
            {biographies.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-10 h-10 text-gold-300 mx-auto mb-2" />
                <p className="text-sm text-ink/40">还没有传记</p>
                <p className="text-xs text-ink/30 mt-1">选择时间范围开始创作吧</p>
              </div>
            ) : (
              biographies.map((bio) => (
                <div
                  key={bio.id}
                  onClick={() => handleSelect(bio.id)}
                  className={cn(
                    'group relative flex items-start justify-between rounded-xl p-4 cursor-pointer transition-all border',
                    selectedId === bio.id
                      ? 'bg-gradient-to-r from-gold-50 to-ivory border-gold-400 shadow-md'
                      : 'hover:bg-ivory/60 border-transparent hover:border-gold-200'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{STYLE_ICONS[bio.style]}</span>
                      <p className="font-medium text-ink truncate">{bio.title}</p>
                    </div>
                    <p className="text-xs text-ink/50 mb-2">
                      {formatDateRange(bio.startDate, bio.endDate)}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="inline-block rounded-full bg-gold-500/10 px-2.5 py-0.5 text-xs text-gold-700">
                        {STYLE_LABELS[bio.style]}
                      </span>
                      <span className="text-xs text-ink/40">
                        {getMomentCount(bio.chapters)} 条记录
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(bio.id)
                    }}
                    className="ml-2 p-1.5 rounded-lg text-ink/30 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        {!currentBio ? (
          <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gold-100 to-gold-200 flex items-center justify-center mb-6">
              <BookOpen className="w-12 h-12 text-gold-500" />
            </div>
            <p className="font-display text-2xl text-ink mb-2">选择或创作一篇传记</p>
            <p className="text-ink/50 max-w-md">
              在左侧选择时间范围和风格，让我们一起把这段时光变成一个动人的故事
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              {Object.entries(STYLE_ICONS).slice(0, 6).map(([key, icon]) => (
                <div
                  key={key}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl bg-ivory/50"
                >
                  <span className="text-2xl">{icon}</span>
                  <span className="text-xs text-ink/50">{STYLE_LABELS[key]}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="fade-in max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-gold-100 to-gold-200 mb-4">
                <span className="text-3xl">{STYLE_ICONS[currentBio.style]}</span>
              </div>
              <h1 className="font-display text-4xl text-ink mb-3">
                {currentBio.title}
              </h1>
              <p className="text-ink/60">
                {STYLE_LABELS[currentBio.style]}
                {currentBio.writerId && (
                  <span className="ml-2">· 参考作家：{getWriterName(currentBio.writerId)}</span>
                )}
                <span className="mx-2">·</span>
                {formatDateRange(currentBio.startDate, currentBio.endDate)}
              </p>
              <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
                <button
                  onClick={openContinueModal}
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-sm text-white hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  续写传记
                </button>
                <button
                  onClick={() => {
                    if (editing) {
                      setEditing(false)
                    } else {
                      setEditContent(currentBio.chapters.map((c) => c.content).join('\n\n---\n\n'))
                      setEditing(true)
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-gold-300 px-4 py-2 text-sm text-ink/70 hover:bg-parchment/40 transition-colors"
                >
                  {editing ? <Sparkles className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                  {editing ? '预览' : '编辑'}
                </button>
                {editing && (
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 rounded-lg bg-gold-500 px-4 py-2 text-sm text-white hover:bg-gold-600 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    保存
                  </button>
                )}
                <button className="flex items-center gap-1.5 rounded-lg border border-gold-300 px-4 py-2 text-sm text-ink/70 hover:bg-parchment/40 transition-colors">
                  <Download className="w-4 h-4" />
                  导出
                </button>
              </div>
            </div>

            {editing ? (
              <div className="bg-white rounded-2xl shadow-lg border border-gold-100 p-6">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full min-h-[60vh] bg-transparent text-lg leading-9 text-ink/80 font-body focus:outline-none resize-none"
                  placeholder="在这里编辑传记内容..."
                />
              </div>
            ) : (
              <div className="bg-gradient-to-b from-ivory/50 to-white rounded-2xl shadow-lg border border-gold-100 overflow-hidden">
                {currentBio.chapters.map((chapter, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'p-8',
                      idx < currentBio.chapters.length - 1 && 'border-b border-gold-100'
                    )}
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-100 to-gold-200 flex items-center justify-center">
                        {getChapterDecorator(currentBio.style, idx)}
                      </div>
                      <h2 className="font-display text-2xl text-ink">
                        {chapter.title}
                      </h2>
                    </div>
                    <div className="text-ink/80 leading-9 text-lg font-body whitespace-pre-line pl-13">
                      {chapter.content}
                    </div>

                    {chapter.mediaIds && chapter.mediaIds.length > 0 && (
                      <div className="mt-6 ml-13">
                        <p className="text-xs text-ink/40 mb-3 flex items-center gap-1.5">
                          <Image size={12} /> 相关媒体 ({chapter.mediaIds.length})
                        </p>
                        <div className="flex gap-3 overflow-x-auto pb-2">
                          {chapter.mediaIds.slice(0, 5).map((mediaId) => (
                            <div
                              key={mediaId}
                              className="h-24 w-32 flex-shrink-0 rounded-xl bg-gold-50 border border-gold-200 flex items-center justify-center text-gold-400 cursor-pointer hover:border-gold-400 hover:bg-gold-100 transition-all group"
                              onClick={() => navigate(`/media/${mediaId}`)}
                            >
                              <Image size={24} className="group-hover:scale-110 transition-transform" />
                            </div>
                          ))}
                          {chapter.mediaIds.length > 5 && (
                            <div className="h-24 w-24 flex-shrink-0 rounded-xl bg-gold-50 border border-gold-200 flex items-center justify-center text-gold-600 font-medium">
                              +{chapter.mediaIds.length - 5}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {chapter.momentIds && chapter.momentIds.length > 0 && (
                      <div className="mt-4 ml-13">
                        <p className="text-xs text-ink/40 mb-2 flex items-center gap-1.5">
                          <Clock size={12} /> 时光记录 ({chapter.momentIds.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {chapter.momentIds.slice(0, 4).map((momentId) => (
                            <span
                              key={momentId}
                              className="inline-block rounded-full bg-ivory border border-gold-200 px-3 py-1 text-xs text-ink/60 cursor-pointer hover:border-gold-400 hover:bg-gold-50 transition-colors"
                              onClick={() => navigate(`/timeline?id=${momentId}`)}
                            >
                              查看动态
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <div className="p-8 bg-gradient-to-t from-gold-50/50 to-transparent text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gold-100 mb-4">
                    <Star className="w-6 h-6 text-gold-500" />
                  </div>
                  <p className="text-ink/40 text-sm">— 全文完 —</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {showContinueModal && currentBio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl text-white">续写传记</h3>
                <button
                  onClick={() => setShowContinueModal(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-white/80 text-sm mt-1">
                选择续写的时间范围，基于新的时光动态继续创作
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                <p className="text-sm text-emerald-700">
                  <span className="font-medium">当前传记：</span>{currentBio.title}
                </p>
                <p className="text-xs text-emerald-600 mt-1">
                  原有时间范围：{formatDateRange(currentBio.startDate, currentBio.endDate)}
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-sm text-ink/60">
                  <Calendar size={14} />
                  续写时间范围
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={continueStartDate}
                    onChange={(e) => setContinueStartDate(e.target.value)}
                    className="flex-1 rounded-lg border border-gold-200 bg-ivory/60 px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:border-emerald-400"
                  />
                  <input
                    type="date"
                    value={continueEndDate}
                    onChange={(e) => setContinueEndDate(e.target.value)}
                    className="flex-1 rounded-lg border border-gold-200 bg-ivory/60 px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {getCurrentWriters().length > 0 && (
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 text-sm text-ink/60">
                    <PenTool size={14} />
                    续写作家
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setShowWriterDropdown(!showWriterDropdown)}
                      className="w-full flex items-center justify-between rounded-lg border border-gold-200 bg-ivory/60 px-3 py-2 text-sm text-ink hover:bg-ivory transition"
                    >
                      <span className="flex items-center gap-2">
                        <PenTool size={14} className="text-gold-500" />
                        <span>
                          {writerId
                            ? getWriterName(writerId)
                            : currentBio.writerId
                            ? `沿用：${getWriterName(currentBio.writerId)}`
                            : '随机选择'}
                        </span>
                      </span>
                      <ChevronDown size={16} className={cn('transition-transform', showWriterDropdown && 'rotate-180')} />
                    </button>
                    {showWriterDropdown && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowWriterDropdown(false)} />
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gold-200/60 z-20 max-h-60 overflow-y-auto">
                          <button
                            onClick={() => { setWriterId(''); setShowWriterDropdown(false) }}
                            className={cn(
                              'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-gold-100',
                              !writerId ? 'bg-gold-50 text-gold-700' : 'hover:bg-gold-50/50 text-ink/70'
                            )}
                          >
                            <span className="text-xl">🎲</span>
                            <div className="flex-1">
                              <p className="font-medium">沿用原作家</p>
                              <p className="text-xs text-ink/40 mt-0.5">
                                {currentBio.writerId ? `继续使用${getWriterName(currentBio.writerId)}风格` : '随机选择一位作家'}
                              </p>
                            </div>
                          </button>
                          {getCurrentWriters().map((writer) => (
                            <button
                              key={writer.id}
                              onClick={() => { setWriterId(writer.id); setShowWriterDropdown(false) }}
                              className={cn(
                                'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-gold-100 last:border-b-0',
                                writerId === writer.id ? 'bg-gold-50 text-gold-700' : 'hover:bg-gold-50/50 text-ink/70'
                              )}
                            >
                              <span className="text-xl">✍️</span>
                              <div className="flex-1">
                                <p className="font-medium">{writer.name}</p>
                                <p className="text-xs text-ink/40 mt-0.5">{writer.description}</p>
                              </div>
                              {writerId === writer.id && (
                                <div className="w-2 h-2 rounded-full bg-gold-500 mt-2" />
                              )}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowContinueModal(false)}
                className="flex-1 rounded-lg border border-gold-300 px-4 py-2.5 text-sm text-ink/70 hover:bg-parchment/40 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleContinue}
                disabled={continuing}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm text-white font-medium transition-all hover:shadow-lg hover:shadow-emerald-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {continuing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {continuing ? '续写中...' : '开始续写'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Heart({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  )
}
