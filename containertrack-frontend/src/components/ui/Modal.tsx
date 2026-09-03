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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`w-full ${sizeClasses[size]} rounded-lg bg-white shadow-modal`}>
        <div className="flex items-center justify-between border-b border-sage px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-dark-brown">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-dark-brown/70 hover:bg-black/5 hover:text-dark-brown"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-sage px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}
