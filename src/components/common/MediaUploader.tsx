import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Music, FileText, CheckCircle2, X, AlertCircle } from 'lucide-react';

interface MediaUploaderProps {
  accept?: string;
  label?: string;
  maxSizeMB?: number;
  onUploadComplete: (fileInfo: {
    name: string;
    size: string;
    type: 'image' | 'audio' | 'document';
    base64: string;
    file: File;
  }) => void;
  className?: string;
}

export function MediaUploader({
  accept = 'image/*,audio/*,.pdf,.doc,.docx,.xlsx,.txt',
  label = 'Kéo thả file vào đây hoặc bấm để chọn tệp (Ảnh, Âm thanh, Tài liệu)',
  maxSizeMB = 20,
  onUploadComplete,
  className = '',
}: MediaUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    name: string;
    size: string;
    type: 'image' | 'audio' | 'document';
    base64: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessFile = (file: File) => {
    setError(null);
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Dung lượng file vượt quá giới hạn cho phép (${maxSizeMB}MB).`);
      return;
    }

    setLoading(true);
    const reader = new FileReader();

    reader.onload = () => {
      const base64String = reader.result as string;
      let fileType: 'image' | 'audio' | 'document' = 'document';
      if (file.type.startsWith('image/')) {
        fileType = 'image';
      } else if (file.type.startsWith('audio/')) {
        fileType = 'audio';
      }

      const sizeKB = (file.size / 1024).toFixed(1);
      const sizeFormatted = Number(sizeKB) > 1024 ? `${(Number(sizeKB) / 1024).toFixed(2)} MB` : `${sizeKB} KB`;

      const fileInfo = {
        name: file.name,
        size: sizeFormatted,
        type: fileType,
        base64: base64String,
      };

      setPreview(fileInfo);
      setLoading(false);
      onUploadComplete({
        ...fileInfo,
        file,
      });
    };

    reader.onerror = () => {
      setError('Đã xảy ra lỗi khi đọc tệp tin.');
      setLoading(false);
    };

    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
            : preview
            ? 'border-emerald-300 bg-emerald-50/20 hover:border-emerald-400'
            : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
        }`}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-4 space-y-2">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-medium text-slate-600">Đang xử lý tệp tin...</p>
          </div>
        ) : preview ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-emerald-200 shadow-xs">
              <div className="flex items-center gap-3 text-left overflow-hidden">
                {preview.type === 'image' ? (
                  <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 overflow-hidden border border-indigo-200">
                    <img src={preview.base64} alt={preview.name} className="w-full h-full object-cover" />
                  </div>
                ) : preview.type === 'audio' ? (
                  <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 text-amber-700">
                    <Music className="w-6 h-6" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 text-blue-700">
                    <FileText className="w-6 h-6" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{preview.name}</p>
                  <p className="text-[11px] text-slate-500">{preview.size} • Tải lên thành công</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                  title="Xóa tệp"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {preview.type === 'audio' && (
              <audio controls src={preview.base64} className="w-full h-9 mt-2" />
            )}

            <p className="text-[11px] text-indigo-600 font-medium">Bấm hoặc kéo thả để thay thế tệp khác</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-3 space-y-2">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
              <Upload className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-700">{label}</p>
              <p className="text-[11px] text-slate-400">Dung lượng tối đa {maxSizeMB}MB</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-lg border border-rose-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
