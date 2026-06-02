import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Trash2, Download, Edit3, Save, Loader2, Sparkles } from 'lucide-react'
import { api } from '@/lib/api'
import { useStore } from '@/store/useStore'
import type { Biography, BiographyChapter } from '@/types'
import { STYLE_LABELS } from '@/types'
import { cn } from '@/lib/utils'

export default function BiographyPage() {
  const navigate = useNavigate()
  const { biographies, addBiography, removeBiography, updateBiographyItem, setBiographies } = useStore()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [currentBio, setCurrentBio] = useState<Biography | null>(null)
  const [startYear, setStartYear] = useState<number | ''>('')
  const [endYear, setEndYear] = useState<number | ''>('')
  const [style, setStyle] = useState<string>('formal')
  const [language] = useState<string>('zh')
  const [generating, setGenerating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')

  useEffect(() => {
    api.biography.list().then(setBiographies).catch(() => {})
  }, [setBiographies])

  useEffect(() => {
    if (!selectedId) {
      setCurrentBio(null)
      return
    }
    api.biography.get(selectedId).then((bio) => {
      setCurrentBio(bio)
      setEditContent(bio.chapters.map((c: BiographyChapter) => c.content).join('\n\n'))
    }).catch(() => {})
  }, [selectedId])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const bio = await api.biography.generate({
        startYear: startYear === '' ? undefined : Number(startYear),
        endYear: endYear === '' ? undefined : Number(endYear),
        style,
        language,
      })
      addBiography(bio)
      setSelectedId(bio.id)
    } catch {
    } finally {
      setGenerating(false)
    }
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
        content: editContent.split('\n\n')[i] ?? c.content,
      }))
      await api.biography.update(currentBio.id, { chapters })
      updateBiographyItem(currentBio.id, { chapters })
      setCurrentBio({ ...currentBio, chapters })
      setEditing(false)
    } catch {}
  }

  return (
    <div className="flex min-h-screen -m-8">
      <aside className="w-72 flex-shrink-0 bg-parchment/40 border-r border-gold-200 overflow-y-auto p-6 sticky top-0 h-screen">
        <h1 className="font-display text-2xl text-ink golden-underline inline-block mb-6">传记工坊</h1>

        <div className="space-y-4 mb-8">
          <div className="flex gap-3">
            <input
              type="number"
              placeholder="起始年份"
              value={startYear}
              onChange={(e) => setStartYear(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full rounded-lg border border-gold-200 bg-ivory/60 px-3 py-2 text-ink placeholder:text-ink/40 focus:outline-none focus:border-gold-400"
            />
            <input
              type="number"
              placeholder="结束年份"
              value={endYear}
              onChange={(e) => setEndYear(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full rounded-lg border border-gold-200 bg-ivory/60 px-3 py-2 text-ink placeholder:text-ink/40 focus:outline-none focus:border-gold-400"
            />
          </div>

          <div className="flex gap-2">
            {Object.entries(STYLE_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setStyle(key)}
                className={cn(
                  'flex-1 rounded-lg py-2 text-sm font-medium transition-colors',
                  style === key
                    ? 'bg-gold-500 text-white'
                    : 'bg-ivory/60 text-ink/70 hover:bg-ivory'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-gold-500 py-3 text-white font-medium transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {generating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <BookOpen className="w-5 h-5" />
            )}
            {generating ? '生成中...' : '生成传记'}
          </button>
        </div>

        <div className="border-t border-gold-200 pt-4">
          <h2 className="font-display text-lg text-ink/70 mb-3">历史传记</h2>
          <div className="space-y-2">
            {biographies.map((bio) => (
              <div
                key={bio.id}
                onClick={() => handleSelect(bio.id)}
                className={cn(
                  'group flex items-start justify-between rounded-lg p-3 cursor-pointer transition-colors',
                  selectedId === bio.id
                    ? 'bg-gold-500/15 border border-gold-400'
                    : 'hover:bg-ivory/60 border border-transparent'
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink truncate">{bio.title}</p>
                  <p className="text-xs text-ink/50 mt-1">
                    {bio.startYear}–{bio.endYear}
                  </p>
                  <span className="inline-block mt-1 rounded-full bg-gold-500/10 px-2 py-0.5 text-xs text-gold-700">
                    {STYLE_LABELS[bio.style]}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(bio.id)
                  }}
                  className="ml-2 mt-1 p-1 rounded text-ink/30 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex-1 p-8">
        {!currentBio ? (
          <div className="flex flex-col items-center justify-center min-h-[70vh] text-ink/40">
            <BookOpen className="w-16 h-16 mb-4" />
            <p className="font-display text-xl">选择或生成一篇传记</p>
          </div>
        ) : (
          <div className="fade-in">
            <div className="flex items-start justify-between mb-8">
              <div>
                <h1 className="font-display text-3xl text-ink golden-underline inline-block">
                  {currentBio.title}
                </h1>
                <p className="text-ink/60 mt-3">
                  {STYLE_LABELS[currentBio.style]} · {currentBio.startYear}–{currentBio.endYear}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (editing) {
                      setEditing(false)
                    } else {
                      setEditContent(currentBio.chapters.map((c) => c.content).join('\n\n'))
                      setEditing(true)
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-gold-300 px-3 py-2 text-sm text-ink/70 hover:bg-parchment/40 transition-colors"
                >
                  {editing ? <Sparkles className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                  {editing ? '预览' : '编辑'}
                </button>
                {editing && (
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 rounded-lg bg-gold-500 px-3 py-2 text-sm text-white hover:opacity-90 transition-opacity"
                  >
                    <Save className="w-4 h-4" />
                    保存
                  </button>
                )}
                <button className="flex items-center gap-1.5 rounded-lg border border-gold-300 px-3 py-2 text-sm text-ink/70 hover:bg-parchment/40 transition-colors">
                  <Download className="w-4 h-4" />
                  导出 PDF
                </button>
                <button className="flex items-center gap-1.5 rounded-lg border border-gold-300 px-3 py-2 text-sm text-ink/70 hover:bg-parchment/40 transition-colors">
                  <Download className="w-4 h-4" />
                  导出 TXT
                </button>
              </div>
            </div>

            {editing ? (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full min-h-[60vh] rounded-lg border border-gold-200 bg-parchment/30 p-6 text-lg leading-8 text-ink/80 font-body focus:outline-none focus:border-gold-400 resize-y"
              />
            ) : (
              <div className="space-y-0">
                {currentBio.chapters.map((chapter, idx) => (
                  <section key={idx}>
                    <h2 className="font-display text-xl text-gold-700 mt-8 mb-4 border-l-4 border-gold-400 pl-4">
                      {chapter.title}
                    </h2>
                    <div className="text-ink/80 leading-8 text-lg font-body whitespace-pre-line">
                      {chapter.content}
                    </div>
                    {chapter.mediaIds.length > 0 && (
                      <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
                        {chapter.mediaIds.map((mediaId) => (
                          <div
                            key={mediaId}
                            className="h-24 w-36 flex-shrink-0 rounded-lg bg-gold-100 border border-gold-200 flex items-center justify-center text-gold-400 text-xs"
                          >
                            {mediaId.slice(0, 6)}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

