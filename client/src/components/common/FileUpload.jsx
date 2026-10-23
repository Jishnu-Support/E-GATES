import React, { useState, useRef, useEffect } from 'react';
import {
  HiArrowUpTray,
  HiDocumentText,
  HiPhoto,
  HiXMark,
  HiEye,
  HiArrowTopRightOnSquare,
} from 'react-icons/hi2';
import { getFileUrl } from '../../services/api';

export default function FileUpload({
  label,
  helperText = 'PDF, PNG, JPG up to 5MB',
  accept = '.pdf,image/png,image/jpeg,image/jpg',
  maxSizeMB = 5,
  multiple = false,
  onChange,
  value,
  error,
  disabled = false,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [internalFiles, setInternalFiles] = useState([]);
  const [fileUrls, setFileUrls] = useState([]);
  const [failedImages, setFailedImages] = useState(new Set());
  const [previewItem, setPreviewItem] = useState(null); // { url, name, isImage, isPdf, size }
  const fileInputRef = useRef(null);

  // Sync with value if passed (e.g. File or File[] or existing url/object)
  const currentFiles = value
    ? Array.isArray(value)
      ? value
      : [value]
    : internalFiles;

  // Manage object URLs safely with proper cleanup
  useEffect(() => {
    const createdBlobUrls = [];
    const processed = currentFiles
      .map((file) => {
        if (!file) return null;
        if (file instanceof File || file instanceof Blob) {
          try {
            const blobUrl = URL.createObjectURL(file);
            createdBlobUrls.push(blobUrl);
            const isImage = file.type
              ? file.type.startsWith('image/')
              : /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.name || '');
            const isPdf =
              file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');

            return {
              file,
              url: blobUrl,
              name: file.name || 'Attachment',
              size: file.size || null,
              isImage,
              isPdf,
            };
          } catch (e) {
            console.warn('Could not create ObjectURL for file:', e);
            return null;
          }
        }

        if (typeof file === 'string') {
          const fullUrl = getFileUrl(file);
          const name = file.split('/').pop() || 'Attachment';
          const isImage = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(name);
          const isPdf = /\.pdf$/i.test(name);
          return {
            file,
            url: fullUrl,
            name,
            size: null,
            isImage,
            isPdf,
          };
        }

        if (typeof file === 'object') {
          const path = file.url || file.path || '';
          const fullUrl = path ? getFileUrl(path) : '';
          const name = file.name || path.split('/').pop() || 'Attachment';
          const isImage =
            file.type?.startsWith('image/') ||
            /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(name);
          const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(name);
          return {
            file,
            url: fullUrl,
            name,
            size: file.size || null,
            isImage,
            isPdf,
          };
        }

        return null;
      })
      .filter(Boolean);

    setFileUrls(processed);

    return () => {
      createdBlobUrls.forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch (e) {}
      });
    };
  }, [currentFiles]);

  // Handle escape key to close preview modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && previewItem) {
        setPreviewItem(null);
      }
    };
    if (previewItem) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [previewItem]);

  const validateAndHandleFiles = (fileList) => {
    if (!fileList || fileList.length === 0) return;

    const filesArray = Array.from(fileList);
    const validFiles = [];
    const maxBytes = maxSizeMB * 1024 * 1024;

    for (const file of filesArray) {
      if (file.size > maxBytes) {
        alert(`File "${file.name}" exceeds the maximum size of ${maxSizeMB}MB.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      const result = multiple ? [...currentFiles, ...validFiles] : [validFiles[0]];
      setInternalFiles(result);
      if (onChange) {
        onChange(multiple ? result : result[0]);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!disabled && e.dataTransfer.files) {
      validateAndHandleFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      validateAndHandleFiles(e.target.files);
    }
  };

  const handleRemove = (index, e) => {
    e.stopPropagation();
    const updated = currentFiles.filter((_, i) => i !== index);
    setInternalFiles(updated);
    if (onChange) {
      onChange(multiple ? updated : updated[0] || null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenPreview = (item, e) => {
    if (e) e.stopPropagation();
    if (!item || !item.url) return;
    setPreviewItem(item);
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      {/* Upload Dropzone */}
      <div
        onClick={() => !disabled && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition ${
          isDragOver
            ? 'border-primary-500 bg-primary-50/50'
            : error
            ? 'border-red-300 bg-red-50/30'
            : 'border-gray-300 bg-gray-50/50 hover:bg-gray-50 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-blue-100 text-primary-600 flex items-center justify-center mb-2">
            <HiArrowUpTray className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-gray-700">
            <span className="text-primary-600 hover:underline">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500 mt-1">{helperText}</p>
        </div>
      </div>

      {/* Selected File Previews with Recheck / View Feature */}
      {fileUrls.length > 0 && (
        <div className="mt-3 space-y-2">
          {fileUrls.map((item, idx) => {
            const hasBrokenImg = failedImages.has(item.url);

            return (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 sm:p-3 bg-white hover:bg-gray-50/80 border border-gray-200 hover:border-primary-300 rounded-xl shadow-xs transition group"
              >
                {/* Clickable Area to Preview / Recheck */}
                <div
                  className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                  onClick={(e) => handleOpenPreview(item, e)}
                  title="Click to view and recheck this file"
                >
                  {/* Thumbnail / Icon */}
                  {item.isImage && !hasBrokenImg ? (
                    <div className="w-11 h-11 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 bg-gray-100 flex items-center justify-center relative shadow-xs group-hover:ring-2 group-hover:ring-primary-400 transition">
                      <img
                        src={item.url}
                        alt={item.name}
                        onError={() =>
                          setFailedImages((prev) => new Set(prev).add(item.url))
                        }
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                        <HiEye className="w-4 h-4 text-white drop-shadow-sm" />
                      </div>
                    </div>
                  ) : item.isPdf ? (
                    <div className="w-11 h-11 rounded-lg bg-red-50 border border-red-200 text-red-600 flex flex-col items-center justify-center flex-shrink-0 shadow-xs group-hover:ring-2 group-hover:ring-red-300 transition">
                      <HiDocumentText className="w-5 h-5 text-red-600" />
                      <span className="text-[9px] font-black uppercase text-red-700 leading-none mt-0.5">
                        PDF
                      </span>
                    </div>
                  ) : (
                    <div className="w-11 h-11 rounded-lg bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center flex-shrink-0 shadow-xs group-hover:ring-2 group-hover:ring-purple-300 transition">
                      <HiPhoto className="w-5 h-5 text-purple-600" />
                    </div>
                  )}

                  {/* File Metadata */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-primary-700 truncate transition">
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                      {item.size ? (
                        <span>{(item.size / (1024 * 1024)).toFixed(2)} MB</span>
                      ) : null}
                      <span className="text-[11px] font-semibold text-primary-600 group-hover:underline flex items-center gap-0.5">
                        <HiEye className="w-3.5 h-3.5" />
                        <span>Click to recheck</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions: View and Remove */}
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={(e) => handleOpenPreview(item, e)}
                    className="px-2.5 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 border border-primary-200 hover:border-primary-300 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                    title="View and recheck this document"
                  >
                    <HiEye className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">View</span>
                  </button>

                  {!disabled && (
                    <button
                      type="button"
                      onClick={(e) => handleRemove(idx, e)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Remove file"
                    >
                      <HiXMark className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {/* Document / Image / PDF Recheck Preview Modal */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setPreviewItem(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-3.5 sm:px-5 bg-gray-900 text-white flex items-center justify-between gap-3 border-b border-gray-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-white/10 rounded-lg text-white">
                  {previewItem.isPdf ? (
                    <HiDocumentText className="w-5 h-5 text-red-400" />
                  ) : (
                    <HiPhoto className="w-5 h-5 text-purple-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white truncate drop-shadow-xs">
                    {previewItem.name}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-gray-300">
                    <span className="uppercase font-semibold tracking-wider text-amber-300">
                      {previewItem.isPdf
                        ? 'PDF Document'
                        : previewItem.isImage
                        ? 'Image File'
                        : 'Uploaded File'}
                    </span>
                    {previewItem.size && (
                      <span>
                        • {(previewItem.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={previewItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white rounded-xl text-xs font-semibold border border-gray-700 transition"
                  title="Open full document in a new browser tab"
                >
                  <HiArrowTopRightOnSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">Open in New Tab</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition border border-transparent hover:border-gray-700"
                  title="Close preview (Esc)"
                >
                  <HiXMark className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-gray-100 min-h-[300px] max-h-[72vh]">
              {previewItem.isImage ? (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <img
                    src={previewItem.url}
                    alt={previewItem.name}
                    className="max-w-full max-h-[68vh] object-contain rounded-xl shadow-lg border border-gray-200 bg-white"
                  />
                </div>
              ) : previewItem.isPdf ? (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <iframe
                    src={previewItem.url}
                    title={previewItem.name}
                    className="w-full h-[68vh] rounded-xl border border-gray-300 bg-white shadow-inner"
                  />
                  <div className="mt-2 text-center text-xs text-gray-500">
                    <span>If the PDF preview does not display inside the browser, </span>
                    <a
                      href={previewItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 font-bold hover:underline"
                    >
                      click here to open in a new tab
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 space-y-3">
                  <HiDocumentText className="w-16 h-16 text-gray-400 mx-auto" />
                  <p className="text-sm font-semibold text-gray-700">
                    Direct preview not available for this format.
                  </p>
                  <a
                    href={previewItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-bold"
                  >
                    <HiArrowTopRightOnSquare className="w-4 h-4" />
                    <span>Open in New Tab</span>
                  </a>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 px-5 bg-white border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                ✓ Recheck completed. You can safely close this preview and continue filling your form.
              </span>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="px-4 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
