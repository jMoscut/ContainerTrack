import type { ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" };

export function Modal({ isOpen, onClose, title, children, footer, size = "md" }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="animate-overlay-fade fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div className={`animate-modal-pop w-full ${sizeClasses[size]} rounded-lg bg-white shadow-modal`}>
        <div className="flex items-center justify-between rounded-t-lg border-b border-sage/70 bg-ivory/60 px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-dark-brown">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-dark-brown/70 transition-colors duration-150 hover:bg-black/5 hover:text-dark-brown focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 rounded-b-lg border-t border-sage/70 bg-ivory/40 px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
