import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";

const LANGUAGES = [
  { code: "es", flag: "🇬🇹" },
  { code: "en", flag: "🇺🇸" },
] as const;

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = i18n.resolvedLanguage === "en" ? "en" : "es";

  const toggle = () => {
    const next = current === "es" ? "en" : "es";
    i18n.changeLanguage(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t("language.label")}
      title={t(`language.${current === "es" ? "en" : "es"}`)}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-medium text-primary transition-colors duration-150 hover:bg-[rgba(0,79,46,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
    >
      <Languages size={16} />
      <span aria-hidden>{LANGUAGES.find((l) => l.code === current)?.flag}</span>
      <span className="hidden sm:inline">{current.toUpperCase()}</span>
    </button>
  );
}
