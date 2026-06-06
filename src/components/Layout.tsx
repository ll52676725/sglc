import { NavLink, Outlet } from "react-router-dom";
import { Camera, FolderTree, BookOpen, Feather, Sparkles, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "记忆收集", icon: Camera, description: "发布动态、上传照片" },
  { to: "/organize", label: "智能整理", icon: FolderTree, description: "AI分类、相册管理" },
  { to: "/biography", label: "传记工坊", icon: BookOpen, description: "生成、编辑传记" },
];

export default function Layout() {
  return (
    <div className="flex">
      <aside className="fixed left-0 top-0 w-64 h-screen bg-gradient-to-b from-gold-900/90 to-gold-800/90 backdrop-blur-md flex flex-col border-r border-gold-700/30">
        <div className="px-6 py-6 border-b border-gold-700/30">
          <h1 className="font-display text-2xl text-gold-100 flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-gold-400" />
            时光簿
          </h1>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-2">
          {navItems.map(({ to, label, icon: Icon, description }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
            >
              {({ isActive }) => (
                <div className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-body transition-all duration-200 group cursor-pointer",
                  isActive
                    ? "bg-gold-500/30 text-gold-200"
                    : "text-gold-300/70 hover:text-gold-100 hover:bg-gold-500/10"
                )}>
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                    isActive ? "bg-gold-500/40" : "bg-gold-500/10 group-hover:bg-gold-500/20"
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{label}</div>
                    <div className="text-xs text-gold-400/60 truncate">{description}</div>
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

        <div className="px-6 py-6 border-t border-gold-700/30 flex items-center justify-center">
          <Feather className="w-5 h-5 text-gold-500/50" />
        </div>
      </aside>

      <main className="ml-64 p-8 min-h-screen w-full">
        <Outlet />
      </main>
    </div>
  );
}
