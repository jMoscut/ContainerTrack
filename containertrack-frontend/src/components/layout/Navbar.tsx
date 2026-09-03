import { LogOut } from "lucide-react";
import { useAuth } from "../../store/AuthContext";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  OPERATOR: "Operador",
  WAREHOUSE: "Bodega",
};

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-end gap-4 border-b border-sage bg-white px-6 shadow-card">
      {user && (
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-dark-brown">{user.fullName}</p>
            <span className="inline-block rounded-full bg-sage px-2 py-0.5 text-xs font-semibold text-dark-brown">
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-primary hover:bg-[rgba(0,79,46,0.08)]"
            aria-label="Cerrar sesión"
          >
            <LogOut size={16} />
            Salir
          </button>
        </div>
      )}
    </header>
  );
}
