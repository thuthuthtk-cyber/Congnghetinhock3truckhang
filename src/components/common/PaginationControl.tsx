import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationControlProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  className?: string;
}

export const PaginationControl: React.FC<PaginationControlProps> = ({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  itemLabel = 'bản ghi',
  className = '',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const startRecord = totalItems === 0 ? 0 : startIndex + 1;
  const endRecord = Math.min(startIndex + pageSize, totalItems);

  // Generate page numbers with smart ellipsis for large page counts
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-100 text-xs text-slate-600 ${className}`}
    >
      {/* 1. Dropdown Hiển thị & 2. Text trạng thái & 3. Chỉ số trang */}
      <div className="flex items-center gap-2 flex-wrap">
        <span>Hiển thị:</span>
        <select
          value={pageSize}
          onChange={(e) => {
            const newSize = Number(e.target.value);
            if (onPageSizeChange) {
              onPageSizeChange(newSize);
            }
            onPageChange(1);
          }}
          className="px-2 py-1 border border-slate-300 rounded-lg bg-slate-50 text-xs font-bold focus:outline-none cursor-pointer"
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              {option} {itemLabel} / trang
            </option>
          ))}
        </select>

        <span className="text-slate-500">
          (Bản ghi {startRecord} - {endRecord} trên tổng {totalItems})
        </span>
        <span className="font-bold text-slate-700">
          - Trang {currentPage} / {totalPages}
        </span>
      </div>

      {/* 4. Nút điều hướng Quay lại, số trang, Tiếp theo */}
      <div className="flex items-center gap-1 flex-wrap">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1 text-xs"
        >
          <ChevronLeft className="w-3 h-3" /> Quay lại
        </button>

        {pageNumbers.map((p, idx) => {
          if (typeof p === 'string') {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="px-2 py-1 text-slate-400 font-bold text-xs select-none"
              >
                ...
              </span>
            );
          }
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`w-8 h-8 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                currentPage === p
                  ? 'bg-indigo-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {p}
            </button>
          );
        })}

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1 text-xs"
        >
          Tiếp theo <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
