import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../store/AuthContext";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Navbar() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-end gap-4 border-b border-sage bg-white/90 px-4 shadow-subtle backdrop-blur-sm sm:px-6">
      <LanguageSwitcher />
      {user && (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-primary text-xs font-bold text-ivory shadow-subtle">
            {user.fullName
              .split(" ")
              .slice(0, 2)
              .map((part) => part[0])
              .join("")
              .toUpperCase()}
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold leading-tight text-dark-brown">{user.fullName}</p>
            <span className="inline-block rounded-full bg-sage px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-dark-brown">
              {t(`roles.${user.role}`, { defaultValue: user.role })}
            </span>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-primary transition-colors duration-150 hover:bg-[rgba(0,79,46,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            aria-label={t("navbar.closeSession")}
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">{t("navbar.logout")}</span>
          </button>
        </div>
      )}
    </header>
  );
}
