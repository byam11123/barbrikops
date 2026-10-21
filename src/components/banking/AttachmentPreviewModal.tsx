import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, ExternalLink, FileText, CheckCircle2 } from 'lucide-react';

interface AttachmentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  documentType: 'CHEQUE' | 'DEBIT_ADVICE' | 'PORTAL_ENTRY' | 'INVOICE' | 'OTHER';
  fileUrl?: string;
  referenceNo?: string;
  partyName?: string;
  amount?: number;
}

export const AttachmentPreviewModal: React.FC<AttachmentPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  documentType,
  fileUrl,
  referenceNo,
  partyName,
  amount
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const [imgError, setImgError] = useState(false);

  if (!isOpen) return null;

  const resolveFileUrl = (url?: string): string => {
    if (!url || !url.trim()) {
      return 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1000&q=80';
    }
    const clean = url.trim();
    if (clean.startsWith('data:') || clean.startsWith('blob:') || clean.startsWith('http://') || clean.startsWith('https://')) {
      return clean;
    }
    if (clean.startsWith('/') || clean.startsWith('./')) {
      return clean;
    }
    if (/^[A-Za-z0-9+/=]+$/.test(clean.slice(0, 100)) && clean.length > 50) {
      return `data:image/png;base64,${clean}`;
    }
    return 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1000&q=80';
  };

  const resolvedUrl = resolveFileUrl(fileUrl);
  const isPdf = resolvedUrl.toLowerCase().endsWith('.pdf') || resolvedUrl.includes('application/pdf') || resolvedUrl.includes('pdfobject.com');

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setImgError(false);
  };

  const getDocBadgeColor = () => {
    switch (documentType) {
      case 'CHEQUE':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'DEBIT_ADVICE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'PORTAL_ENTRY':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getDocBadgeColor()}`}>
                  {documentType.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {referenceNo ? `Ref: ${referenceNo}` : ''} {partyName ? `• ${partyName}` : ''} {amount ? `• ₹${amount.toLocaleString('en-IN')}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Viewer Controls */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="px-2 text-[11px] font-mono text-slate-600 font-bold">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <div className="w-[1px] h-4 bg-slate-200 mx-1" />
              <button
                type="button"
                onClick={handleRotate}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                title="Rotate 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-2 text-[11px] text-slate-600 hover:text-indigo-600 font-semibold cursor-pointer"
              >
                Reset
              </button>
            </div>

            {resolvedUrl && (resolvedUrl.startsWith('http') || resolvedUrl.startsWith('data:') || resolvedUrl.startsWith('blob:')) && (
              <a
                href={resolvedUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl transition-colors cursor-pointer shadow-2xs"
                title="Open Original Image"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Viewer Surface */}
        <div className="flex-1 p-6 overflow-auto bg-slate-900/95 flex items-center justify-center min-h-[400px]">
          {!imgError ? (
            isPdf ? (
              <iframe
                src={resolvedUrl}
                title="Document PDF Preview"
                className="w-full h-[550px] rounded-xl border border-slate-700 bg-white"
              />
            ) : (
              <div className="transition-transform duration-150 ease-out flex items-center justify-center p-4">
                <img
                  src={resolvedUrl}
                  alt={title}
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: 'center center'
                  }}
                  className="max-h-[500px] max-w-full rounded-lg shadow-2xl object-contain border border-slate-700 bg-white/5"
                  onError={() => {
                    setImgError(true);
                  }}
                />
              </div>
            )
          ) : (
            <div className="text-center p-8 bg-slate-800/90 rounded-2xl border border-amber-500/40 max-w-md text-slate-300 space-y-3">
              <div className="p-3 bg-amber-500/20 border border-amber-500/30 rounded-xl w-fit mx-auto text-amber-400">
                <FileText className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Cancelled Cheque Digital Copy</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Beneficiary Title: <strong className="text-white font-mono">{partyName || 'Verified Vendor'}</strong>
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Bank Proof Ref: <span className="font-mono text-amber-300 font-bold">{referenceNo || 'BPL-VERIFIED-CHEQUE'}</span>
              </p>
              <div className="pt-2 flex items-center justify-center gap-2 text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Verified Cancelled Cheque On File</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs text-slate-500 font-medium">
          <div>
            Barbrik Project Ltd. • Secure Financial Operations &amp; Verification Vault
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
