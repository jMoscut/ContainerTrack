import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  Truck,
} from "lucide-react";
import { Navbar } from "./Navbar";
import { usePermissions } from "../../hooks/usePermissions";

const navItems = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true },
  { to: "/containers", labelKey: "nav.containers", icon: ContainerIcon, end: false },
  { to: "/calendar", labelKey: "nav.calendar", icon: Calendar, end: false },
  { to: "/users", labelKey: "nav.users", icon: Users, end: false, adminOnly: true },
  // Navieras/puertos/transportistas: visible a todos los roles, pero de solo lectura
  // fuera de ADMIN (esa restricción vive dentro de cada página, no en la nav/ruta).
  { to: "/navieras", labelKey: "nav.shippingCompanies", icon: Ship, end: false },
  { to: "/puertos", labelKey: "nav.ports", icon: Anchor, end: false },
  { to: "/transportistas", labelKey: "nav.landCarriers", icon: Truck, end: false },
  { to: "/reports", labelKey: "nav.reports", icon: FileText, end: false, reportsOnly: true },
];

export function AppLayout() {
  const { canManageUsers, canGenerateReports } = usePermissions();
  const { t } = useTranslation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const sidebarContent = (
    <>
      <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-white/10 px-5">
        <span className="font-display text-xl font-bold tracking-tight text-ivory">
          Container<span className="text-accent">Track</span>
        </span>
        <button
          type="button"
          className="rounded-md p-1 text-ivory/80 transition-colors duration-150 hover:bg-white/10 hover:text-ivory md:hidden"
          aria-label={t("layout.closeMenu")}
          onClick={() => setIsMobileNavOpen(false)}
        >
          <X size={22} />
        </button>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        {navItems
          .filter((item) => !item.adminOnly || canManageUsers)
          .filter((item) => !item.reportsOnly || canGenerateReports)
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setIsMobileNavOpen(false)}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-md border-l-[3px] px-3 py-2.5 text-sm font-medium transition-all duration-150 ease-out ${
                  isActive
                    ? "border-accent bg-white/10 text-ivory shadow-[inset_0_0_0_1px_rgba(212,175,55,0.15)]"
                    : "border-transparent text-ivory/75 hover:border-accent/40 hover:bg-white/5 hover:text-ivory"
                }`
              }
            >
              <item.icon size={18} className="flex-shrink-0 transition-transform duration-150 group-hover:scale-110" />
              <span className="truncate">{t(item.labelKey)}</span>
            </NavLink>
          ))}
      </nav>
    </>
  );

  return (
    <div className="flex h-screen bg-ivory">
      {/* Desktop sidebar */}
      <aside className="bg-noise hidden w-60 flex-shrink-0 flex-col bg-gradient-hero text-ivory shadow-elevated md:flex">
        {sidebarContent}
      </aside>

      {/* Mobile off-canvas sidebar */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <aside className="animate-modal-pop bg-noise flex w-60 flex-shrink-0 flex-col bg-gradient-hero text-ivory shadow-elevated">
            {sidebarContent}
          </aside>
          <button
            type="button"
            aria-label={t("layout.closeMenu")}
            className="animate-overlay-fade flex-1 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileNavOpen(false)}
          />
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-sage bg-white px-3 shadow-subtle md:hidden">
          <button
            type="button"
            aria-label={t("layout.openMenu")}
            className="rounded-md p-2 text-primary transition-colors duration-150 hover:bg-[rgba(0,79,46,0.08)]"
            onClick={() => setIsMobileNavOpen(true)}
          >
            <Menu size={22} />
          </button>
          <span className="font-display text-lg font-bold text-primary">ContainerTrack</span>
          <span className="w-9" />
        </header>
        <Navbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-ivory p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
