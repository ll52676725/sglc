import { useStore } from '@/store/useStore'
import {
  BookOpen,
  Camera,
  FolderTree,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  Zap,
  Heart,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    icon: BookOpen,
    iconBg: 'from-amber-500 to-orange-500',
    title: '欢迎来到时光簿',
    description: '一个帮你记录美好时光、整理珍贵记忆、生成人生传记的智能平台。',
    showHighlight: false,
  },
  {
    id: 'collect',
    icon: Camera,
    iconBg: 'from-rose-500 to-pink-500',
    title: '第一步：记忆收集',
    description: '在这里发布动态、上传照片和视频，记录生活中的每一个珍贵时刻。',
    showHighlight: true,
    highlightTarget: 'nav-collect',
  },
  {
    id: 'quick-actions',
    icon: Zap,
    iconBg: 'from-amber-500 to-yellow-500',
    title: '三种方式快速开始',
    description: '发布动态记录心情、上传媒体保存照片、或直接进入智能整理。',
    showHighlight: true,
    highlightTarget: 'quick-actions',
  },
  {
    id: 'organize',
    icon: FolderTree,
    iconBg: 'from-emerald-500 to-teal-500',
    title: '第二步：智能整理',
    description: 'AI 自动帮您分类照片、创建相册，让记忆井井有条，一目了然。',
    showHighlight: true,
    highlightTarget: 'nav-organize',
  },
  {
    id: 'biography',
    icon: Sparkles,
    iconBg: 'from-violet-500 to-purple-500',
    title: '第三步：传记工坊',
    description: '选择时间范围和风格，AI 将为您编织成动人的人生传记。',
    showHighlight: true,
    highlightTarget: 'nav-biography',
  },
  {
    id: 'complete',
    icon: Heart,
    iconBg: 'from-rose-500 to-red-500',
    title: '准备好了吗？',
    description: '现在，让我们一起开始记录属于你的美好时光吧！',
    showHighlight: false,
  },
]

export default function OnboardingModal() {
  const {
    showOnboarding,
    onboardingStep,
    nextOnboardingStep,
    prevOnboardingStep,
    completeOnboarding,
    setShowOnboarding,
  } = useStore()

  if (!showOnboarding) return null

  const step = ONBOARDING_STEPS[onboardingStep]
  const isFirstStep = onboardingStep === 0
  const isLastStep = onboardingStep === ONBOARDING_STEPS.length - 1
  const Icon = step.icon

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-md mx-4">
        <button
          onClick={() => setShowOnboarding(false)}
          className="absolute -top-12 right-0 text-white/60 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="bg-gradient-to-br from-gold-900/95 to-gold-800/95 rounded-2xl p-8 border border-gold-700/30 shadow-2xl">
          <div className="flex flex-col items-center text-center">
            <div
              className={cn(
                'w-20 h-20 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br shadow-lg',
                step.iconBg
              )}
            >
              <Icon className="w-10 h-10 text-white" />
            </div>

            <h2 className="text-2xl font-display text-gold-100 mb-3">
              {step.title}
            </h2>

            <p className="text-gold-300/80 font-body leading-relaxed mb-8">
              {step.description}
            </p>

            <div className="flex items-center gap-2 mb-8">
              {ONBOARDING_STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'h-2 rounded-full transition-all duration-300',
                    idx === onboardingStep
                      ? 'w-8 bg-gold-400'
                      : idx < onboardingStep
                      ? 'w-2 bg-gold-500/60'
                      : 'w-2 bg-gold-700/50'
                  )}
                />
              ))}
            </div>

            <div className="flex items-center gap-3 w-full">
              {!isFirstStep && (
                <button
                  onClick={prevOnboardingStep}
                  className="flex-1 px-6 py-3 rounded-xl border border-gold-600/30 text-gold-300 font-medium hover:bg-gold-700/30 transition-all flex items-center justify-center gap-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                  上一步
                </button>
              )}

              {isLastStep ? (
                <button
                  onClick={completeOnboarding}
                  className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 text-white font-medium hover:from-gold-400 hover:to-amber-400 transition-all shadow-lg shadow-gold-500/25 flex items-center justify-center gap-2"
                >
                  开始使用
                  <Sparkles className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={nextOnboardingStep}
                  className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 text-white font-medium hover:from-gold-400 hover:to-amber-400 transition-all shadow-lg shadow-gold-500/25 flex items-center justify-center gap-2"
                >
                  下一步
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>

            {!isLastStep && (
              <button
                onClick={completeOnboarding}
                className="mt-4 text-gold-400/60 hover:text-gold-300 text-sm transition-colors"
              >
                跳过引导
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
