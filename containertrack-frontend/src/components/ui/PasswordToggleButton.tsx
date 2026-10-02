import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PasswordToggleButtonProps {
  visible: boolean;
  onToggle: () => void;
}

export function PasswordToggleButton({ visible, onToggle }: PasswordToggleButtonProps) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={onToggle}
      aria-label={visible ? t("common.hidePassword") : t("common.showPassword")}
      className="rounded p-1 text-gray-400 hover:text-dark-brown"
    >
      {visible ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );
}
