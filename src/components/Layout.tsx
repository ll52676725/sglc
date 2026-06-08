import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Camera, FolderTree, BookOpen, HelpCircle, X, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import OnboardingModal from "./OnboardingModal";
import { useStore } from "@/store/useStore";
import { useTheme, themes, type ThemeType } from "@/hooks/useTheme";

const navItems = [
  { to: "/", label: "记忆", icon: Camera, id: "nav-collect" },
  { to: "/organize", label: "整理", icon: FolderTree, id: "nav-organize" },
  { to: "/biography", label: "传记", icon: BookOpen, id: "nav-biography" },
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
            "relative w-7 h-7 sm:w-8 sm:h-8 rounded-md border-2 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary-500/50",
            theme === t.id ? "border-primary-500 shadow-md" : "border-transparent hover:border-border"
          )}
          style={{ background: t.preview }}
          title={t.name}
        >
          {theme === t.id && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white drop-shadow-md" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

function BottomNav() {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-surface/95 backdrop-blur-md border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around h-14">
        {navItems.map(({ to, label, icon: Icon, id }) => {
          const isActive =
            to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className="flex-1"
            >
              <div
                id={id}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-1 transition-colors",
                  isActive ? "text-primary-500" : "text-text-muted"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "drop-shadow-sm")} />
                <span className={cn("text-[10px] leading-tight", isActive ? "font-semibold" : "font-medium")}>
                  {label}
                </span>
              </div>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export default function Layout() {
  const { setShowOnboarding, setOnboardingStep } = useStore();
  const { currentThemeInfo } = useTheme();

  const handleOpenOnboarding = () => {
    setOnboardingStep(0);
    setShowOnboarding(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <OnboardingModal />

      <header
        className="fixed top-0 left-0 right-0 z-40 h-14 bg-surface/80 backdrop-blur-md border-b border-border lg:pl-64"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="h-full px-3 sm:px-4 lg:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 lg:gap-2">
              <BookOpen className="w-5 h-5 text-primary-500" />
              <span className="font-display text-base text-text-primary">时光簿</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs text-text-muted">当前主题：</span>
              <span className="text-xs text-text-secondary font-medium">{currentThemeInfo.name}</span>
            </div>
            <ThemeSwatches />
            <div className="hidden sm:block w-px h-6 bg-border" />
            <button
              onClick={handleOpenOnboarding}
              className="p-1.5 sm:p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all"
              title="使用引导"
            >
              <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </header>

      <aside
        className={cn(
          "hidden lg:flex fixed left-0 top-0 h-screen z-50 w-64 flex-col",
          "bg-surface border-r border-border",
          "lg:pt-14"
        )}
      >
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, id }) => (
            <NavLink key={to} to={to} end={to === "/"}>
              {({ isActive }) => (
                <div
                  id={id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group cursor-pointer",
                    isActive
                      ? "bg-primary-50 text-primary-700 font-medium"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                  )}
                >
                  <div
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                      isActive
                        ? "bg-primary-500 text-white shadow-sm shadow-primary-500/30"
                        : "bg-surface-hover text-text-muted group-hover:bg-primary-100 group-hover:text-primary-600"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{label}</div>
                  </div>
                  <ChevronRight
                    className={cn(
                      "w-4 h-4 flex-shrink-0 transition-all",
                      isActive ? "opacity-100" : "opacity-0 group-hover:opacity-60"
                    )}
                  />
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

      <main className="lg:ml-64 pt-14 pb-16 lg:pb-0 min-h-screen w-full">
        <div className="p-3 sm:p-4 lg:p-8 animate-fade-in">
          <Outlet />
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
