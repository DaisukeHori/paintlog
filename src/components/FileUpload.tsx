'use client';

import { useRef, useState } from 'react';

interface FileUploadProps {
  photos: string[];
  videos: string[];
  onPhotosChange: (urls: string[]) => void;
  onVideosChange: (urls: string[]) => void;
}

export default function FileUpload({
  photos,
  videos,
  onPhotosChange,
  onVideosChange,
}: FileUploadProps) {
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function uploadFile(file: File, type: 'photo' | 'video') {
    setUploading(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          type,
        }),
      });
      const { uploadUrl, publicUrl } = await res.json();
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (type === 'photo') {
        onPhotosChange([...photos, publicUrl]);
      } else {
        onVideosChange([...videos, publicUrl]);
      }
    } catch (e) {
      console.error('アップロードエラー:', e);
    } finally {
      setUploading(false);
    }
  }

  const handleFiles = (files: FileList | null, type: 'photo' | 'video') => {
    if (!files) return;
    Array.from(files).forEach((f) => uploadFile(f, type));
  };

  return (
    <div>
      <span className="text-xs text-stone-500 mb-2 block">写真・動画</span>
      {/* プレビュー */}
      {(photos.length > 0 || videos.length > 0) && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
          {photos.map((url, i) => (
            <div key={url} className="relative flex-shrink-0">
              <img
                src={url}
                alt={`写真${i + 1}`}
                className="w-20 h-20 object-cover rounded-lg"
              />
              <button
                onClick={() => onPhotosChange(photos.filter((_, j) => j !== i))}
                className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          ))}
          {videos.map((url, i) => (
            <div key={url} className="relative flex-shrink-0">
              <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center text-2xl">
                🎬
              </div>
              <button
                onClick={() => onVideosChange(videos.filter((_, j) => j !== i))}
                className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      {/* ボタン群 */}
      <div className="flex gap-3">
        <button
          onClick={() => photoRef.current?.click()}
          disabled={uploading}
          className="flex-1 h-[72px] rounded-xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center gap-1 text-stone-400 touch-manipulation active:border-blue-300"
        >
          <span className="text-2xl">🖼</span>
          <span className="text-xs">写真</span>
        </button>
        <button
          onClick={() => videoRef.current?.click()}
          disabled={uploading}
          className="flex-1 h-[72px] rounded-xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center gap-1 text-stone-400 touch-manipulation active:border-blue-300"
        >
          <span className="text-2xl">🎥</span>
          <span className="text-xs">動画</span>
        </button>
        <button
          onClick={() => cameraRef.current?.click()}
          disabled={uploading}
          className="flex-1 h-[72px] rounded-xl border border-stone-200 bg-stone-50 flex flex-col items-center justify-center gap-1 text-stone-500 touch-manipulation active:bg-stone-100"
        >
          <span className="text-2xl">📷</span>
          <span className="text-xs">撮影</span>
        </button>
      </div>
      {uploading && (
        <div className="mt-2 text-xs text-orange-700 text-center">
          アップロード中...
        </div>
      )}
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files, 'photo')}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files, 'video')}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files, 'photo')}
      />
    </div>
  );
}
