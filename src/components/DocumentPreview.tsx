"use client";

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileText, Image as ImageIcon, Eye, Upload, Check, X, Trash2 } from 'lucide-react';

interface DocumentPreviewProps {
  label: string;
  existingUrl?: string | null;
  onUploadNew: (file: File) => void;
  onDelete?: () => void; // New prop to handle deletion
  newFile?: File | null;
  required?: boolean;
  accept?: string;
  editMode?: boolean; // New prop to control edit mode
}

export function DocumentPreview({ 
  label, 
  existingUrl, 
  onUploadNew,
  onDelete,
  newFile,
  required = false,
  accept = "image/*,.pdf",
  editMode = true // Default to true for backward compatibility
}: DocumentPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadNew(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const isImage = (url: string) => {
    return url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  };

  const isPDF = (url: string) => {
    return url.match(/\.pdf$/i);
  };

  return (
    <Card className="p-4">
      <div className="space-y-3">
        {/* Label */}
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </h4>
          
          {(existingUrl || newFile) && (
            <div className="flex items-center gap-2">
              {existingUrl && !newFile && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Guna sedia ada
                </span>
              )}
              {newFile && (
                <span className="text-xs text-blue-600 flex items-center gap-1">
                  <Upload className="h-3 w-3" />
                  Dokumen baharu
                </span>
              )}
            </div>
          )}
        </div>

        {/* Combined UI: Existing Document with Upload Option */}
        {existingUrl ? (
          <div className="space-y-3">
            {/* Existing Document Display - Only show if no new file uploaded */}
            {!newFile && (
            <div className="border-2 border-green-200 rounded-lg bg-green-50/50 p-3">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  {editMode && (
                    <div className="text-sm font-medium text-green-800 block mb-1">
                      Guna dokumen sedia ada
                    </div>
                  )}
                  
                  {/* Preview existing document */}
                  {isImage(existingUrl) ? (
                    <div className="flex items-center gap-2 text-xs text-green-700">
                      <ImageIcon className="h-4 w-4" />
                      <span>Dokumen Imej</span>
                    </div>
                  ) : isPDF(existingUrl) ? (
                    <div className="flex items-center gap-2 text-xs text-green-700">
                      <FileText className="h-4 w-4" />
                      <span>Dokumen PDF</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-green-700">
                      <FileText className="h-4 w-4" />
                      <span>Dokumen</span>
                    </div>
                  )}
                </div>
                
                <a
                  href={existingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Eye className="h-4 w-4" />
                  Lihat
                </a>
              </div>
            </div>
            )}

            {/* Show new file preview if uploaded (even when not in edit mode) */}
            {newFile && (
              <div className="border-2 border-blue-200 rounded-lg bg-blue-50/50 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-blue-800 block mb-1">
                      Dokumen baharu
                    </div>
                    <div className="flex items-center gap-2 text-xs text-blue-700">
                      {newFile.type.startsWith('image/') ? (
                        <ImageIcon className="h-4 w-4" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      <span>{newFile.name}</span>
                      <span className="text-gray-500">({(newFile.size / 1024).toFixed(2)} KB)</span>
                    </div>
                  </div>
                  
                  {editMode && onDelete && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Padam
                    </Button>
                  )}
                </div>
                
                {/* Preview new upload */}
                {previewUrl && (
                  <div className="border rounded-lg p-2 bg-white mt-2">
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="w-full h-32 object-contain rounded"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Upload New Option (only show if editMode and no new file) */}
            {editMode && !newFile && (
              <div className="space-y-2">
                <p className="text-xs text-gray-600 flex items-center gap-1">
                  <Upload className="h-3 w-3" />
                  Atau muat naik dokumen baharu:
                </p>
                <label className="block">
                  <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors border-gray-300 hover:border-blue-400 hover:bg-blue-50/30">
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileChange}
                      accept={accept}
                      className="hidden"
                    />
                    
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto" />
                      <p className="text-sm font-medium">Klik untuk upload</p>
                      <p className="text-xs text-gray-500">PDF, JPG, PNG (Max 5MB)</p>
                    </div>
                  </div>
                </label>
              </div>
            )}
          </div>
        ) : (
          /* No existing document - show upload only */
          <div className="space-y-2">
            <label className="block">
              <div className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                newFile 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-300 hover:border-primary hover:bg-primary/5'
              }`}>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept={accept}
                  className="hidden"
                />
                
                {newFile ? (
                  <div className="space-y-2">
                    <Check className="h-8 w-8 text-green-600 mx-auto" />
                    <p className="text-sm font-medium text-green-700">{newFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(newFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto" />
                    <p className="text-sm font-medium">Klik untuk upload</p>
                    <p className="text-xs text-gray-500">PDF, JPG, PNG (Max 5MB)</p>
                  </div>
                )}
              </div>
            </label>

            {/* Preview new upload */}
            {newFile && previewUrl && (
              <div className="border rounded-lg p-2 bg-white">
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="w-full h-32 object-contain rounded"
                />
              </div>
            )}

            {/* Delete button for new upload */}
            {newFile && onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Padam Dokumen
              </Button>
            )}
          </div>
        )}

        {/* Required field warning */}
        {required && !existingUrl && !newFile && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <X className="h-3 w-3" />
            Dokumen ini wajib dimuat naik
          </p>
        )}
      </div>
    </Card>
  );
}
