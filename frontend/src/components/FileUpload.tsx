import { useRef, useState } from 'react';

interface Props {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
  subLabel?: string;
  uploading?: boolean;
  progress?: number;
}

export default function FileUpload({
  onFiles,
  accept = '.pdf,.doc,.docx,.txt',
  multiple = false,
  label = 'Drop files here or click to upload',
  subLabel = 'PDF, DOCX, DOC, TXT',
  uploading = false,
  progress = 0
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    onFiles(Array.from(files));
  };

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
        dragging
          ? 'border-indigo-500 bg-indigo-900/20'
          : 'border-slate-700 hover:border-slate-500 bg-slate-900/50'
      }`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {uploading ? (
        <div className="space-y-3">
          <div className="text-slate-400 text-sm">Uploading...</div>
          <div className="w-full bg-slate-700 rounded-full h-2 max-w-xs mx-auto">
            <div
              className="h-2 bg-indigo-600 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-slate-500">{progress}%</div>
        </div>
      ) : (
        <>
          <div className="text-4xl mb-3">📁</div>
          <div className="text-slate-300 text-sm font-medium mb-1">{label}</div>
          <div className="text-slate-500 text-xs">{subLabel}</div>
        </>
      )}
    </div>
  );
}
