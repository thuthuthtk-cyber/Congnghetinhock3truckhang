import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  itemName?: string;
  itemType?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDeleting?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Xác nhận xóa',
  itemName,
  itemType = 'mục này',
  description,
  confirmLabel = 'Đồng ý',
  cancelLabel = 'Hủy bỏ',
  isDeleting = false
}) => {
  if (!isOpen) return null;

  // Derive title text uppercase format if needed
  const displayTitle = title.startsWith('Xác nhận') || title.startsWith('XÁC NHẬN') 
    ? title.toUpperCase() 
    : `XÁC NHẬN XÓA ${title.toUpperCase()}`;

  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden relative animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Purple/Indigo Header Banner as in Figure 2 */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-4 flex items-center justify-between text-white shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-300" />
            </div>
            <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
              {displayTitle}
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 text-indigo-100 hover:text-white hover:bg-white/10 rounded-xl cursor-pointer transition-colors"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div className="text-sm text-slate-700 leading-relaxed font-medium">
            {description ? (
              <span>{description}</span>
            ) : (
              <span>
                Thầy/Cô có chắc chắn muốn xóa {itemType}:{' '}
                {itemName ? (
                  <strong className="text-indigo-700 font-bold">"{itemName}"</strong>
                ) : (
                  <strong className="text-indigo-700 font-bold">mục đã chọn</strong>
                )}{' '}
                không? Dữ liệu điểm và bài làm liên quan sẽ không thể khôi phục.
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer active:scale-95 disabled:opacity-50 shadow-2xs"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
            }}
            disabled={isDeleting}
            className="px-6 py-2.5 rounded-xl font-extrabold text-xs text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/25 cursor-pointer active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
          >
            <span>{isDeleting ? 'Đang xóa...' : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

