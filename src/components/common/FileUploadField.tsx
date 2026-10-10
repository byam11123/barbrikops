import React, { useRef, useState } from 'react';
import { Upload, Paperclip, X, ExternalLink, Eye } from 'lucide-react';
import { FilePreviewModal } from './FilePreviewModal';

interface FileUploadFieldProps {
  id: string;
  label?: string;
  required?: boolean;
  value?: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export const FileUploadField: React.FC<FileUploadFieldProps> = ({
  id,
  value = '',
  onChange,
  placeholder = 'No file chosen',
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [fileName, setFileName] = useState<string>(() => {
    if (value.startsWith('data:')) {
      return 'Attached Document';
    }
    if (value.startsWith('[File: ')) {
      return value.replace(/^\[File:\s*/, '').replace(/\]$/, '');
    }
    return value;
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formattedSize = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(file.size / 1024)} KB`;

    setFileName(`${file.name} (${formattedSize})`);

    // If file is within 4MB, store as data URL for preview/download
    if (file.size <= 4 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onChange(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } else {
      // For very large files, store reference note with file name
      onChange(`[File: ${file.name} (${formattedSize})]`);
    }
  };

  const handleRemove = () => {
    onChange('');
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const hasValue = Boolean(value && value.trim().length > 0);

  return (
    <div className="space-y-1">
      <input
        ref={fileInputRef}
        type="file"
        id={id}
        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.csv,.txt"
        onChange={handleFileSelect}
        className="hidden"
      />

      {hasValue ? (
        /* Compact attached file bar with interactive preview click */
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer group"
            title="Click to preview file in dialog"
          >
            <Paperclip className="w-3.5 h-3.5 text-emerald-600 shrink-0 group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-emerald-950 truncate underline-offset-2 group-hover:underline">
              {fileName || 'Attached file'}
            </span>
          </button>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="text-emerald-700 hover:text-emerald-900 p-1 hover:bg-emerald-100 rounded cursor-pointer transition-colors"
              title="Preview document"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded cursor-pointer transition-colors"
              title="Remove file"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Simple clean single upload button */
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors shrink-0 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-600" />
            <span>Upload File</span>
          </button>
          <span className="text-xs text-slate-400 truncate flex-1">
            {placeholder || 'No file chosen'}
          </span>
        </div>
      )}

      {/* File Preview Modal */}
      {isPreviewOpen && (
        <FilePreviewModal
          isOpen={isPreviewOpen}
          fileUrl={value}
          fileName={fileName || 'Attached Document'}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </div>
  );
};
