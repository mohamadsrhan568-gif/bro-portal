import { useRef, useState, type DragEvent } from 'react';
import { UploadCloud, File as FileIcon, Loader2 } from 'lucide-react';
import { supabase, DOCUMENTS_BUCKET } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { classNames, formatDate } from '@/lib/utils';

interface FileUploaderProps {
  folder: string; // e.g. `company/{id}` or `employee/{id}`
  onUploaded: (path: string, name: string) => void;
  accept?: string;
  label?: string;
}

export function FileUploader({ folder, onUploaded, label = 'Upload' }: FileUploaderProps) {
  const { toast } = useToast();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setUploading(true);
    for (const file of arr) {
      const ext = file.name.split('.').pop();
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const path = `${folder}/${safeName}`;
      const { error } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (error) {
        toast(`Failed to upload ${file.name}: ${error.message}`, 'error');
      } else {
        onUploaded(path, file.name);
      }
    }
    setUploading(false);
    toast(`${arr.length} file(s) uploaded`, 'success');
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={classNames(
        'rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors',
        dragging
          ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-500/10'
          : 'border-ink-300 dark:border-ink-700 hover:border-brand-400 dark:hover:border-brand-500/50',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) uploadFiles(e.target.files);
          e.target.value = '';
        }}
      />
      {uploading ? (
        <Loader2 className="h-8 w-8 mx-auto animate-spin text-brand-500" />
      ) : (
        <UploadCloud className="h-8 w-8 mx-auto text-ink-400" />
      )}
      <p className="mt-2 text-sm font-medium">{label}</p>
      <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">Drag & drop files here, or click to browse</p>
    </div>
  );
}

export function DocumentLink({ path, name }: { path: string; name: string }) {
  const url = supabase.storage.from(DOCUMENTS_BUCKET).getPublicUrl(path).data.publicUrl;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 text-sm text-brand-600 dark:text-brand-400 hover:underline"
    >
      <FileIcon className="h-4 w-4 flex-shrink-0" />
      <span className="truncate">{name}</span>
    </a>
  );
}

export function documentUrl(path: string): string {
  return supabase.storage.from(DOCUMENTS_BUCKET).getPublicUrl(path).data.publicUrl;
}

export { formatDate };
