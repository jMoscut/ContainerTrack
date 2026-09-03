import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Container as ContainerIcon,
  Calendar,
  Users,
  FileText,
  Menu,
  X,
  Ship,
  Anchor,
} from "lucide-react";
import { Navbar } from "./Navbar";
import { usePermissions } from "../../hooks/usePermissions";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/containers", label: "Contenedores", icon: ContainerIcon, end: false },
  { to: "/calendar", label: "Calendario", icon: Calendar, end: false },
  { to: "/users", label: "Usuarios", icon: Users, end: false, adminOnly: true },
  { to: "/navieras", label: "Navieras", icon: Ship, end: false, adminOnly: true },
  { to: "/puertos", label: "Puertos", icon: Anchor, end: false, adminOnly: true },
  { to: "/reports", label: "Reportes", icon: FileText, end: false },
];

export function AppLayout() {
  const { canManageUsers } = usePermissions();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const sidebarContent = (
    <>
      <div className="flex h-16 items-center justify-between px-5">
        <span className="font-display text-xl font-bold text-ivory">ContainerTrack</span>
        <button
          type="button"
          className="text-ivory md:hidden"
          aria-label="Cerrar menú"
          onClick={() => setIsMobileNavOpen(false)}
        >
          <X size={22} />
        </button>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-2 py-2">
        {navItems
          .filter((item) => !item.adminOnly || canManageUsers)
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setIsMobileNavOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md border-l-[3px] px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-accent bg-primary-light text-ivory"
                    : "border-transparent text-ivory/85 hover:bg-primary-light"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
      </nav>
    </>
  );

  return (
    <div className="flex h-screen bg-ivory">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 flex-shrink-0 flex-col bg-primary text-ivory md:flex">{sidebarContent}</aside>

      {/* Mobile off-canvas sidebar */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <aside className="flex w-60 flex-shrink-0 flex-col bg-primary text-ivory">{sidebarContent}</aside>
          <button
            type="button"
            aria-label="Cerrar menú"
            className="flex-1 bg-black/40"
            onClick={() => setIsMobileNavOpen(false)}
          />
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-sage bg-white px-3 shadow-card md:hidden">
          <button
            type="button"
            aria-label="Abrir menú"
            className="rounded-md p-2 text-primary hover:bg-[rgba(0,79,46,0.08)]"
            onClick={() => setIsMobileNavOpen(true)}
          >
            <Menu size={22} />
          </button>
          <span className="font-display text-lg font-bold text-primary">ContainerTrack</span>
          <span className="w-9" />
        </header>
        <Navbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
