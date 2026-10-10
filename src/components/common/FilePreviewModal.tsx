import React from 'react';
import { X, Download, ExternalLink, FileText, FileSpreadsheet, Eye } from 'lucide-react';

interface FilePreviewModalProps {
  isOpen: boolean;
  fileUrl: string;
  fileName?: string;
  onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  fileUrl,
  fileName = 'Document',
  onClose,
}) => {
  if (!isOpen || !fileUrl) return null;

  const isDataUrl = fileUrl.startsWith('data:');
  const isHttpUrl = fileUrl.startsWith('http://') || fileUrl.startsWith('https://');

  // Detect mime type if available
  let mimeType = '';
  if (isDataUrl) {
    const match = fileUrl.match(/^data:([^;]+);/);
    if (match) {
      mimeType = match[1].toLowerCase();
    }
  }

  const isImage =
    mimeType.startsWith('image/') ||
    /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(fileName) ||
    (!isDataUrl && /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(fileUrl));

  const isPdf =
    mimeType === 'application/pdf' ||
    /\.pdf(\?.*)?$/i.test(fileName) ||
    (!isDataUrl && /\.pdf(\?.*)?$/i.test(fileUrl));

  const handleDownload = () => {
    if (isDataUrl) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName.replace(/\s*\(.*?\)\s*$/, '') || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (isHttpUrl) {
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Title and Actions */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 min-w-0 pr-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 text-indigo-600">
              {isImage ? <Eye className="w-4 h-4" /> : isPdf ? <FileText className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-800 text-sm truncate" title={fileName}>
                {fileName}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isImage ? 'Image Document' : isPdf ? 'PDF Document' : isHttpUrl ? 'Web Link / Document' : 'Attachment'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isHttpUrl && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Tab</span>
              </a>
            )}

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-slate-100/60 min-h-[320px]">
          {isImage ? (
            <img
              src={fileUrl}
              alt={fileName}
              className="max-h-[60vh] max-w-full rounded-lg object-contain shadow-xs border border-slate-200 bg-white"
            />
          ) : isPdf && isDataUrl ? (
            <iframe
              src={fileUrl}
              title={fileName}
              className="w-full h-[60vh] rounded-lg border border-slate-200 bg-white"
            />
          ) : (
            <div className="text-center p-8 bg-white rounded-xl border border-slate-200 shadow-2xs max-w-md w-full space-y-3">
              <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">{fileName}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Preview is available via direct download or new window opening.
                </p>
              </div>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download / View File</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
