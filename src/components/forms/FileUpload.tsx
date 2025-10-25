/**
 * File Upload Component
 * 
 * Reusable file upload component for documents and images
 */

'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface FileUploadProps {
  accept?: string;
  maxSize?: number; // in MB
  onFileSelect: (file: File) => void;
  onFileRemove?: () => void;
  currentFile?: File | null;
  label?: string;
  description?: string;
}

export function FileUpload({
  accept = 'image/*,.pdf',
  maxSize = 10,
  onFileSelect,
  onFileRemove,
  currentFile,
  label = 'Upload File',
  description = 'Drag and drop or click to browse'
}: FileUploadProps): JSX.Element {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File): void => {
    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSize) {
      toast.error(`File size must be less than ${maxSize}MB`);
      return;
    }

    // Validate file type
    if (accept !== '*/*') {
      const acceptedTypes = accept.split(',').map(t => t.trim());
      const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      const fileType = file.type;

      const isAccepted = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return fileExtension === type;
        }
        if (type.endsWith('/*')) {
          return fileType.startsWith(type.replace('/*', ''));
        }
        return fileType === type;
      });

      if (!isAccepted) {
        toast.error('File type not accepted');
        return;
      }
    }

    onFileSelect(file);
  };

  const handleRemove = (): void => {
    if (onFileRemove) {
      onFileRemove();
    }
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>

      {currentFile ? (
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-muted-foreground" />
            <div>
              <div className="font-medium">{currentFile.name}</div>
              <div className="text-sm text-muted-foreground">
                {(currentFile.size / (1024 * 1024)).toFixed(2)} MB
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 transition-colors ${
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept={accept}
            onChange={handleChange}
          />

          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <Upload className="w-10 h-10 text-muted-foreground" />
            <div className="text-sm font-medium">{description}</div>
            <div className="text-xs text-muted-foreground">
              {accept === 'image/*' ? 'Images only' : accept === '.pdf' ? 'PDF only' : 'Images or PDF'} • Max {maxSize}MB
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

