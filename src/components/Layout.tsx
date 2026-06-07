import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Camera, FolderTree, BookOpen, Palette, HelpCircle, Menu, X, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import OnboardingModal from "./OnboardingModal";
import { useStore } from "@/store/useStore";
import { useTheme, themes, type ThemeType } from "@/hooks/useTheme";

const navItems = [
  { to: "/", label: "记忆收集", icon: Camera, description: "发布动态、上传照片", id: "nav-collect" },
  { to: "/organize", label: "智能整理", icon: FolderTree, description: "AI分类、相册管理", id: "nav-organize" },
  { to: "/biography", label: "传记工坊", icon: BookOpen, description: "生成、编辑传记", id: "nav-biography" },
];

function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all"
        title="切换主题"
      >
        <Palette className="w-5 h-5" />
        <span className="hidden lg:inline text-sm">主题</span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute bottom-full mb-2 left-0 z-50 w-64 rounded-xl bg-surface border border-border shadow-large p-3 animate-scale-in">
            <div className="text-sm font-medium text-text-primary mb-2 px-2">选择主题</div>
            <div className="space-y-1">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id as ThemeType);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left",
                    theme === t.id 
                      ? "bg-primary-100 text-primary-700" 
                      : "hover:bg-surface-hover text-text-secondary"
                  )}
                >
                  <div 
                    className="w-8 h-8 rounded-lg border border-border flex-shrink-0"
                    style={{ background: t.preview }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-text-muted truncate">{t.description}</div>
                  </div>
                  {theme === t.id && (
                    <div className="w-2 h-2 rounded-full bg-primary-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function Layout() {
  const { setShowOnboarding, setOnboardingStep } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleOpenOnboarding = () => {
    setOnboardingStep(0);
    setShowOnboarding(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <OnboardingModal />
      
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-surface border border-border shadow-soft text-text-primary hover:bg-surface-hover transition-all"
      >
        <Menu className="w-5 h-5" />
      </button>

      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed left-0 top-0 h-screen z-50 w-64 flex flex-col transition-transform duration-300 ease-out",
        "bg-surface/95 backdrop-blur-md border-r border-border",
        "lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="px-5 py-5 border-b border-border flex items-center justify-between">
          <h1 className="font-display text-xl text-text-primary flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary-500" />
            时光簿
          </h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all"
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
                      ? "bg-primary-100 text-primary-700 font-medium"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                  )}>
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                    isActive ? "bg-primary-500 text-white" : "bg-primary-50 text-primary-500 group-hover:bg-primary-100"
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

        <div className="px-3 py-4 border-t border-border space-y-1">
          <ThemeSelector />
          <button
            onClick={handleOpenOnboarding}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all"
          >
            <HelpCircle className="w-5 h-5" />
            <span className="hidden lg:inline text-sm">使用引导</span>
          </button>
        </div>
      </aside>

      <main className="lg:ml-64 min-h-screen w-full">
        <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
