import { NavLink, Outlet } from "react-router-dom";
import { Clock, FolderOpen, Upload, BookOpen, Feather } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "时间线", icon: Clock },
  { to: "/albums", label: "相册", icon: FolderOpen },
  { to: "/upload", label: "上传", icon: Upload },
  { to: "/biography", label: "传记", icon: BookOpen },
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

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-body transition-all duration-200",
                  isActive
                    ? "bg-gold-500/30 text-gold-200"
                    : "text-gold-300/70 hover:text-gold-100 hover:bg-gold-500/10"
                )
              }
            >
              <Icon className="w-4.5 h-4.5" />
              {label}
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
