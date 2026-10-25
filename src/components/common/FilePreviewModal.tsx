import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  RotateCw,
  ExternalLink, 
  FileText, 
  FileSpreadsheet, 
  Eye, 
  AlertCircle 
} from 'lucide-react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';

interface FilePreviewModalProps {
  isOpen: boolean;
  fileUrl: string;
  fileName?: string;
  onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  fileUrl,
  fileName = 'Document.pdf',
  onClose,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState<number>(0);
  const [effectiveUrl, setEffectiveUrl] = useState<string>('');
  const [iframeError, setIframeError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const transformComponentRef = useRef<ReactZoomPanPinchRef | null>(null);

  // Detect Data URL or HTTP(s) URL
  const isDataUrl = Boolean(fileUrl && fileUrl.startsWith('data:'));
  const isHttpUrl = Boolean(fileUrl && (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')));
  const isBlobUrl = Boolean(fileUrl && fileUrl.startsWith('blob:'));

  let mimeType = '';
  if (isDataUrl) {
    const match = fileUrl.match(/^data:([^;]+);/);
    if (match) {
      mimeType = match[1].toLowerCase();
    }
  }

  // 1. Robust PDF detection: check data URL prefix, mime type, .pdf extension in URL or fileName, or PDF magic bytes
  const isPdf = useMemo(() => {
    if (!fileUrl) return false;
    const cleanUrl = fileUrl.trim();
    return (
      cleanUrl.startsWith('data:application/pdf') ||
      mimeType === 'application/pdf' ||
      /\.pdf(\?.*)?$/i.test(fileName) ||
      /\.pdf(\?.*)?$/i.test(cleanUrl) ||
      cleanUrl.includes('application/pdf') ||
      cleanUrl.startsWith('data:;base64,JVBERi') ||
      cleanUrl.startsWith('data:application/octet-stream;base64,JVBERi')
    );
  }, [fileUrl, fileName, mimeType]);

  // 2. Robust Image detection
  const isImage = useMemo(() => {
    if (!fileUrl || isPdf) return false;
    const cleanUrl = fileUrl.trim();
    return (
      cleanUrl.startsWith('data:image/') ||
      mimeType.startsWith('image/') ||
      /\.(png|jpe?g|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(fileName) ||
      /\.(png|jpe?g|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(cleanUrl)
    );
  }, [fileUrl, fileName, mimeType, isPdf]);

  // Convert base64 data URLs to Blob URLs for fast, crash-free, iframe-compatible rendering
  useEffect(() => {
    if (!fileUrl) {
      setEffectiveUrl('');
      return;
    }

    let createdBlobUrl: string | null = null;

    if (fileUrl.startsWith('data:')) {
      try {
        const parts = fileUrl.split(',');
        const rawMime = parts[0].match(/:(.*?);/)?.[1] || (isPdf ? 'application/pdf' : 'application/octet-stream');
        const byteCharacters = atob(parts[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: rawMime });
        createdBlobUrl = URL.createObjectURL(blob);
        setEffectiveUrl(createdBlobUrl);
      } catch (err) {
        console.warn('Could not convert data URL to Blob, using raw URL', err);
        setEffectiveUrl(fileUrl);
      }
    } else {
      setEffectiveUrl(fileUrl);
    }

    setZoom(1);
    setRotation(0);
    setIframeError(false);

    return () => {
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [fileUrl, isPdf]);

  if (!isOpen || !fileUrl) return null;

  // Zoom controls (unified for both Image and PDF)
  const handleZoomIn = () => {
    if (isImage && transformComponentRef.current) {
      transformComponentRef.current.zoomIn(0.3);
    } else {
      setZoom((prev) => Math.min(Math.round((prev + 0.25) * 100) / 100, 2.5));
    }
  };

  const handleZoomOut = () => {
    if (isImage && transformComponentRef.current) {
      transformComponentRef.current.zoomOut(0.3);
    } else {
      setZoom((prev) => Math.max(Math.round((prev - 0.25) * 100) / 100, 0.5));
    }
  };

  const handleResetZoom = () => {
    if (isImage && transformComponentRef.current) {
      transformComponentRef.current.resetTransform();
    }
    setZoom(1);
    setRotation(0);
  };

  // Rotation control
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Safe file name with guaranteed extension
  const getSafeFileName = () => {
    let clean = fileName.replace(/\s*\(.*?\)\s*$/, '').trim() || 'document';
    if (isPdf && !/\.pdf$/i.test(clean)) {
      clean += '.pdf';
    } else if (isImage && !/\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(clean)) {
      clean += '.png';
    }
    return clean;
  };

  // Download handler
  const handleDownload = () => {
    const targetUrl = effectiveUrl || fileUrl;
    const downloadName = getSafeFileName();
    const link = document.createElement('a');
    link.href = targetUrl;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print handler with rotation preservation
  const handlePrint = () => {
    if (isPdf && iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      } catch {
        // Continue to fallback print window below
      }
    }

    const printTarget = effectiveUrl || fileUrl;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${getSafeFileName()}</title>
            <style>
              body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }
              img { max-width: 95vw; max-height: 95vh; object-contain; transform: rotate(${rotation}deg); transform-origin: center center; }
            </style>
          </head>
          <body>
            <img src="${printTarget}" onload="window.focus(); window.print();" />
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Pass #toolbar=1 to iframe for native PDF controls
  const pdfSourceWithToolbar = effectiveUrl
    ? effectiveUrl.includes('#')
      ? effectiveUrl
      : `${effectiveUrl}#toolbar=1`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header & Integrated Control Toolbar */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2.5">
          {/* File Name & Document Type */}
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 text-indigo-600">
              {isImage ? <Eye className="w-4 h-4" /> : isPdf ? <FileText className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-800 text-xs sm:text-sm truncate" title={getSafeFileName()}>
                {getSafeFileName()}
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                {isImage ? 'Image Document (Pan & Zoom Enabled)' : isPdf ? 'PDF Document (Interactive Viewer)' : 'Attachment Document'}
              </p>
            </div>
          </div>

          {/* Full Action Toolbar: Zoom In, Zoom Out, Reset, Rotate, Print, Download */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Zoom Controls */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <div className="w-[1px] h-3.5 bg-slate-200 mx-0.5" />
              <button
                type="button"
                onClick={handleResetZoom}
                className="px-2 py-1 text-[10px] font-bold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer transition-colors"
                title="Reset Zoom & Rotation"
              >
                Reset
              </button>
            </div>

            {/* Rotate Button (Available for both Image & PDF) */}
            <button
              type="button"
              onClick={handleRotate}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs transition-colors cursor-pointer"
              title="Rotate 90° Clockwise"
            >
              <RotateCw className="w-3.5 h-3.5 text-indigo-600" />
              <span>Rotate</span>
              {rotation > 0 && <span className="font-mono text-[10px] text-indigo-600">({rotation}°)</span>}
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs transition-colors cursor-pointer"
              title="Print document"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Print</span>
            </button>

            {/* Download Button */}
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-colors cursor-pointer"
              title="Download file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>

            {/* Open in Tab */}
            {(isHttpUrl || isBlobUrl) && (
              <a
                href={effectiveUrl || fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs transition-colors"
                title="Open file in separate tab"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">Open in Tab</span>
              </a>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer ml-1"
              title="Close viewer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewing Area */}
        <div className="p-3 sm:p-5 overflow-auto flex-1 flex items-center justify-center bg-slate-100 min-h-[420px]">
          {isImage ? (
            /* Interactive Zoom, Pan & Rotate Image Canvas using react-zoom-pan-pinch */
            <div className="w-full h-full flex-1 flex items-center justify-center overflow-hidden bg-slate-900/95 rounded-xl relative select-none">
              <TransformWrapper
                ref={transformComponentRef}
                initialScale={1}
                minScale={0.5}
                maxScale={6}
                centerOnInit
                wheel={{ step: 0.15 }}
                doubleClick={{ mode: 'reset' }}
              >
                <TransformComponent
                  wrapperClass="!w-full !h-[68vh] !flex !items-center !justify-center overflow-hidden cursor-grab active:cursor-grabbing"
                  contentClass="!flex !items-center !justify-center"
                >
                  <img
                    src={effectiveUrl || fileUrl}
                    alt={fileName}
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      transition: 'transform 0.2s ease-out',
                    }}
                    className="max-h-[66vh] max-w-full rounded-md shadow-2xl object-contain border border-slate-700/60 bg-white/5"
                    draggable={false}
                  />
                </TransformComponent>
              </TransformWrapper>
              <div className="absolute bottom-2.5 left-3 px-3 py-1 rounded-md bg-black/60 text-[11px] text-white/90 pointer-events-none backdrop-blur-xs flex items-center gap-2 font-medium">
                <span>Scroll / pinch to zoom • Drag to pan</span>
                {rotation > 0 && <span className="font-mono text-amber-300 font-bold">• Rotated {rotation}°</span>}
              </div>
            </div>
          ) : isPdf ? (
            /* Interactive PDF Iframe with Object & Direct Link Fallback */
            <div className="w-full h-full flex-1 flex flex-col items-center justify-center relative overflow-hidden">
              {!iframeError ? (
                <div
                  className="w-full h-full flex items-center justify-center overflow-auto"
                  style={{
                    transform: `${zoom !== 1 ? `scale(${zoom}) ` : ''}${rotation !== 0 ? `rotate(${rotation}deg)` : ''}`.trim() || undefined,
                    transformOrigin: 'top center',
                    transition: 'transform 0.15s ease-out',
                  }}
                >
                  <iframe
                    ref={iframeRef}
                    src={pdfSourceWithToolbar}
                    title={fileName}
                    className="w-full h-[68vh] rounded-xl border border-slate-300 bg-white shadow-xs"
                    onError={() => setIframeError(true)}
                  >
                    {/* Native object fallback if iframe fails */}
                    <object
                      data={pdfSourceWithToolbar}
                      type="application/pdf"
                      className="w-full h-[68vh] rounded-xl"
                    >
                      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 space-y-3">
                        <FileText className="w-10 h-10 text-indigo-600 mx-auto" />
                        <p className="font-bold text-slate-800 text-sm">{fileName}</p>
                        <p className="text-xs text-slate-500">
                          Your browser does not support inline PDF frame display.
                        </p>
                        <a
                          href={effectiveUrl || fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download / Open PDF</span>
                        </a>
                      </div>
                    </object>
                  </iframe>
                </div>
              ) : (
                /* Interactive Object Fallback */
                <object
                  data={pdfSourceWithToolbar}
                  type="application/pdf"
                  className="w-full h-[68vh] rounded-xl border border-slate-300 bg-white"
                >
                  <div className="p-8 text-center bg-white rounded-xl border border-slate-200 space-y-3">
                    <FileText className="w-10 h-10 text-indigo-600 mx-auto" />
                    <p className="font-bold text-slate-800 text-sm">{fileName}</p>
                    <p className="text-xs text-slate-500">
                      Direct PDF embedding unavailable. Click below to view or download.
                    </p>
                    <div className="flex justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={handleDownload}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download PDF</span>
                      </button>
                    </div>
                  </div>
                </object>
              )}
            </div>
          ) : (
            /* Generic Document Viewer / Fallback */
            <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md w-full space-y-3">
              <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm truncate">{fileName}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Document attached. Use the download button to open or view offline.
                </p>
              </div>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Document</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
