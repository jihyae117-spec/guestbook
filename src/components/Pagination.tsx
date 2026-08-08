"use client";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 text-sm">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="rounded border border-pink-200 px-3 py-1 text-pink-700 hover:bg-pink-50 disabled:opacity-40"
      >
        이전
      </button>
      <span className="text-pink-700">
        {page} / {totalPages}
      </span>
      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="rounded border border-pink-200 px-3 py-1 text-pink-700 hover:bg-pink-50 disabled:opacity-40"
      >
        다음
      </button>
    </div>
  );
}
