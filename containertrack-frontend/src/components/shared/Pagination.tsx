import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 border-t border-sage/50 px-3 py-3 sm:gap-3 sm:py-4">
      <button
        type="button"
        disabled={page <= 0}
        onClick={() => onPageChange(page - 1)}
        aria-label={t("pagination.previousLabel")}
        className="inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-md border border-sage px-3 text-sm font-medium text-dark-brown transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-sage disabled:hover:text-dark-brown"
      >
        <ChevronLeft size={16} />
        <span className="hidden sm:inline">{t("pagination.previous")}</span>
      </button>
      <span className="whitespace-nowrap px-1 text-sm font-medium text-dark-brown">
        {t("pagination.pageOf", { page: page + 1, total: totalPages })}
      </span>
      <button
        type="button"
        disabled={page >= totalPages - 1}
        onClick={() => onPageChange(page + 1)}
        aria-label={t("pagination.nextLabel")}
        className="inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-md border border-sage px-3 text-sm font-medium text-dark-brown transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-sage disabled:hover:text-dark-brown"
      >
        <span className="hidden sm:inline">{t("pagination.next")}</span>
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
