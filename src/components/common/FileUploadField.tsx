import React, { useRef, useState } from 'react';
import { Upload, Paperclip, X, ExternalLink, Eye, Loader2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';
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
  const [isCompressing, setIsCompressing] = useState(false);
  const [fileName, setFileName] = useState<string>(() => {
    if (value.startsWith('data:')) {
      return 'Attached Document';
    }
    if (value.startsWith('[File: ')) {
      return value.replace(/^\[File:\s*/, '').replace(/\]$/, '');
    }
    return value;
  });

  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict file type validation: only image/jpeg, image/png, image/webp, application/pdf
    const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

    const isAllowed = ALLOWED_MIME.includes(file.type) || ALLOWED_EXT.includes(ext);
    if (!isAllowed) {
      setUploadError('Unsupported file format. Please upload JPG, PNG, WEBP images or PDF files only.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name);

    // Limit original file input size to 15MB before processing
    const MAX_RAW_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_RAW_SIZE) {
      setUploadError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 15 MB.`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setUploadError(null);

    // If it's an image, compress it down to < 500KB to protect Firestore document size limits
    if (isImage) {
      setIsCompressing(true);
      try {
        const compressionOptions = {
          maxSizeMB: 0.45, // < 500 KB target
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: file.type || 'image/jpeg',
        };

        const compressedBlob = await imageCompression(file, compressionOptions);
        const finalSizeKb = Math.round(compressedBlob.size / 1024);
        setFileName(`${file.name} (${finalSizeKb} KB)`);

        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            onChange(reader.result);
          }
          setIsCompressing(false);
        };
        reader.onerror = () => {
          setUploadError('Failed to read compressed image. Please retry.');
          setIsCompressing(false);
        };
        reader.readAsDataURL(compressedBlob);
      } catch (err) {
        console.warn('Image compression failed or unsupported, falling back to direct reader:', err);
        // Fallback: direct reader if compression fails
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            onChange(reader.result);
          }
          setIsCompressing(false);
        };
        reader.onerror = () => {
          setUploadError('Failed to read image.');
          setIsCompressing(false);
        };
        reader.readAsDataURL(file);
      }
    } else {
      // PDF document handling
      const formattedSize = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

      setFileName(`${file.name} (${formattedSize})`);

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onChange(reader.result);
        }
      };
      reader.onerror = () => {
        setUploadError('Failed to read PDF file.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemove = () => {
    onChange('');
    setFileName('');
    setUploadError(null);
    setIsCompressing(false);
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
        accept="image/jpeg,image/png,image/webp,application/pdf"
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
            disabled={isCompressing}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors shrink-0 cursor-pointer disabled:opacity-60"
          >
            {isCompressing ? (
              <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5 text-indigo-600" />
            )}
            <span>{isCompressing ? 'Compressing Image (<500KB)...' : 'Upload File'}</span>
          </button>
          <span className="text-xs text-slate-400 truncate flex-1">
            {isCompressing ? 'Optimizing resolution for database safety...' : placeholder || 'No file chosen (JPG, PNG, PDF)'}
          </span>
        </div>
      )}

      {uploadError && (
        <div className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-2.5 py-1.5 flex items-center justify-between">
          <span>{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-rose-500 hover:text-rose-800 ml-2"
          >
            <X className="w-3 h-3" />
          </button>
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
