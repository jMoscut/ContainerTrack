interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 py-3">
      <button
        type="button"
        disabled={page <= 0}
        onClick={() => onPageChange(page - 1)}
        className="rounded-md border border-sage px-3 py-1 text-sm text-dark-brown disabled:opacity-40"
      >
        Anterior
      </button>
      <span className="text-sm text-dark-brown">
        Página {page + 1} de {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages - 1}
        onClick={() => onPageChange(page + 1)}
        className="rounded-md border border-sage px-3 py-1 text-sm text-dark-brown disabled:opacity-40"
      >
        Siguiente
      </button>
    </div>
  );
}
