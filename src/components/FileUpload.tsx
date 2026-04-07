'use client';

import { useRef, useState } from 'react';

interface FileUploadProps {
  photos: string[];
  videos: string[];
  onPhotosChange: (urls: string[]) => void;
  onVideosChange: (urls: string[]) => void;
}

export default function FileUpload({
  photos, videos, onPhotosChange, onVideosChange,
}: FileUploadProps) {
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [viewer, setViewer] = useState<{ type: 'photo' | 'video'; url: string; index: number } | null>(null);

  async function uploadFile(file: File, type: 'photo' | 'video') {
    setUploading(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, type }),
      });
      const { uploadUrl, publicUrl } = await res.json();
      await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (type === 'photo') onPhotosChange([...photos, publicUrl]);
      else onVideosChange([...videos, publicUrl]);
    } catch (e) { console.error('アップロードエラー:', e); }
    finally { setUploading(false); }
  }

  const handleFiles = (files: FileList | null, type: 'photo' | 'video') => {
    if (!files) return;
    Array.from(files).forEach((f) => uploadFile(f, type));
  };

  // 全メディアリスト（写真→動画の順）
  const allMedia = [
    ...photos.map((url, i) => ({ type: 'photo' as const, url, index: i })),
    ...videos.map((url, i) => ({ type: 'video' as const, url, index: i })),
  ];

  // ビューアーのナビ
  const viewerIdx = viewer ? allMedia.findIndex(m => m.type === viewer.type && m.url === viewer.url) : -1;
  const goPrev = () => { if (viewerIdx > 0) { const m = allMedia[viewerIdx - 1]; setViewer(m); } };
  const goNext = () => { if (viewerIdx < allMedia.length - 1) { const m = allMedia[viewerIdx + 1]; setViewer(m); } };

  return (
    <>
      <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-sm">
        <span className="text-xs text-stone-500 mb-2 block">写真・動画</span>

        {/* プレビュー（タップで閲覧） */}
        {allMedia.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
            {photos.map((url, i) => (
              <div key={`p-${i}`} className="relative flex-shrink-0">
                <button onClick={() => setViewer({ type: 'photo', url, index: i })} className="touch-manipulation">
                  <img src={url} alt={`写真${i + 1}`} className="w-20 h-20 object-cover rounded-lg" />
                </button>
                <button onClick={() => onPhotosChange(photos.filter((_, j) => j !== i))}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">✕</button>
              </div>
            ))}
            {videos.map((url, i) => (
              <div key={`v-${i}`} className="relative flex-shrink-0">
                <button onClick={() => setViewer({ type: 'video', url, index: i })} className="touch-manipulation">
                  <div className="w-20 h-20 rounded-lg overflow-hidden relative bg-stone-800">
                    <video src={url} preload="metadata" muted playsInline className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="w-8 h-8 bg-white/80 rounded-full flex items-center justify-center text-sm">▶</span>
                    </div>
                  </div>
                </button>
                <button onClick={() => onVideosChange(videos.filter((_, j) => j !== i))}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">✕</button>
              </div>
            ))}
          </div>
        )}

        {/* ボタン群 */}
        <div className="flex gap-3">
          <button onClick={() => photoRef.current?.click()} disabled={uploading}
            className="flex-1 h-[72px] rounded-xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center gap-1 text-stone-400 touch-manipulation active:border-blue-300">
            <span className="text-2xl">🖼</span><span className="text-xs">写真</span>
          </button>
          <button onClick={() => videoRef.current?.click()} disabled={uploading}
            className="flex-1 h-[72px] rounded-xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center gap-1 text-stone-400 touch-manipulation active:border-blue-300">
            <span className="text-2xl">🎥</span><span className="text-xs">動画</span>
          </button>
          <button onClick={() => cameraRef.current?.click()} disabled={uploading}
            className="flex-1 h-[72px] rounded-xl border border-stone-200 bg-stone-50 flex flex-col items-center justify-center gap-1 text-stone-500 touch-manipulation active:bg-stone-100">
            <span className="text-2xl">📷</span><span className="text-xs">撮影</span>
          </button>
        </div>
        {uploading && <div className="mt-2 text-xs text-orange-700 text-center pl-pulse">アップロード中...</div>}
        <input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files, 'photo')} />
        <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={(e) => handleFiles(e.target.files, 'video')} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFiles(e.target.files, 'photo')} />
      </div>

      {/* フルスクリーン メディアビューアー */}
      {viewer && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col" onClick={() => setViewer(null)}>
          {/* ヘッダー */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/80" onClick={(e) => e.stopPropagation()}>
            <span className="text-white text-sm font-medium">
              {viewer.type === 'photo' ? '📷' : '🎬'} {viewerIdx + 1} / {allMedia.length}
            </span>
            <button onClick={() => setViewer(null)} className="w-10 h-10 flex items-center justify-center text-white text-xl touch-manipulation">✕</button>
          </div>

          {/* メディア */}
          <div className="flex-1 flex items-center justify-center relative" onClick={(e) => e.stopPropagation()}>
            {viewer.type === 'photo' ? (
              <img src={viewer.url} alt="" className="max-w-full max-h-full object-contain" />
            ) : (
              <video src={viewer.url} controls autoPlay playsInline className="max-w-full max-h-full" />
            )}

            {/* 前へ/次へ */}
            {viewerIdx > 0 && (
              <button onClick={(e) => { e.stopPropagation(); goPrev(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-xl touch-manipulation">
                ‹
              </button>
            )}
            {viewerIdx < allMedia.length - 1 && (
              <button onClick={(e) => { e.stopPropagation(); goNext(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-xl touch-manipulation">
                ›
              </button>
            )}
          </div>

          {/* サムネイルストリップ */}
          {allMedia.length > 1 && (
            <div className="flex gap-2 px-4 py-3 bg-black/80 overflow-x-auto" onClick={(e) => e.stopPropagation()}>
              {allMedia.map((m, mi) => (
                <button key={mi} onClick={() => setViewer(m)}
                  className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 ${mi === viewerIdx ? 'border-white' : 'border-transparent opacity-50'}`}>
                  {m.type === 'photo' ? (
                    <img src={m.url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-stone-700 flex items-center justify-center text-white text-xs">▶</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
