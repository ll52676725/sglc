import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Camera, FolderTree, BookOpen, HelpCircle, Menu, X, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import OnboardingModal from "./OnboardingModal";
import { useStore } from "@/store/useStore";
import { useTheme, themes, type ThemeType } from "@/hooks/useTheme";

const navItems = [
  { to: "/", label: "记忆收集", icon: Camera, description: "发布动态、上传照片", id: "nav-collect" },
  { to: "/organize", label: "智能整理", icon: FolderTree, description: "AI分类、相册管理", id: "nav-organize" },
  { to: "/biography", label: "传记工坊", icon: BookOpen, description: "生成、编辑传记", id: "nav-biography" },
];

function ThemeSwatches() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1.5">
      {themes.map((t) => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id as ThemeType)}
          className={cn(
            "relative w-8 h-8 rounded-md border-2 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary-500/50",
            theme === t.id ? "border-primary-500 shadow-md" : "border-transparent hover:border-border"
          )}
          style={{ background: t.preview }}
          title={t.name}
        >
          {theme === t.id && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Check className="w-4 h-4 text-white drop-shadow-md" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

export default function Layout() {
  const { setShowOnboarding, setOnboardingStep } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentThemeInfo } = useTheme();

  const handleOpenOnboarding = () => {
    setOnboardingStep(0);
    setShowOnboarding(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <OnboardingModal />

      <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-surface/80 backdrop-blur-md border-b border-border lg:pl-64" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="h-full px-4 lg:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="lg:hidden flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary-500" />
              <span className="font-display text-base text-text-primary">时光簿</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs text-text-muted">当前主题：</span>
              <span className="text-xs text-text-secondary font-medium">{currentThemeInfo.name}</span>
            </div>
            <ThemeSwatches />
            <div className="w-px h-6 bg-border" />
            <button
              onClick={handleOpenOnboarding}
              className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all"
              title="使用引导"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed left-0 top-0 h-screen z-50 w-64 flex flex-col transition-transform duration-300 ease-out",
        "bg-surface border-r border-border",
        "lg:translate-x-0 lg:pt-14",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="px-5 py-4 border-b border-border lg:hidden flex items-center justify-between">
          <h1 className="font-display text-lg text-text-primary flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary-500" />
            时光簿
          </h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, description, id }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setSidebarOpen(false)}
            >
              {({ isActive }) => (
                <div
                  id={id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group cursor-pointer",
                    isActive
                      ? "bg-primary-50 text-primary-700 font-medium"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                  )}>
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                    isActive 
                      ? "bg-primary-500 text-white shadow-sm shadow-primary-500/30" 
                      : "bg-surface-hover text-text-muted group-hover:bg-primary-100 group-hover:text-primary-600"
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{label}</div>
                    <div className="text-xs text-text-muted truncate">{description}</div>
                  </div>
                  <ChevronRight className={cn(
                    "w-4 h-4 flex-shrink-0 transition-all",
                    isActive ? "opacity-100" : "opacity-0 group-hover:opacity-60"
                  )} />
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-hover">
            <div 
              className="w-8 h-8 rounded-md border border-border flex-shrink-0"
              style={{ background: currentThemeInfo.preview }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text-primary">{currentThemeInfo.name}</div>
              <div className="text-xs text-text-muted truncate">{currentThemeInfo.description}</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="lg:ml-64 pt-14 min-h-screen w-full" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
