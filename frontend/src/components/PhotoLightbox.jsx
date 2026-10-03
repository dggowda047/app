import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { fileUrl } from "@/lib/api";

export function PhotoLightbox({ photos, startIndex = 0, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const next = () => { setZoom(false); setIdx((i) => (i + 1) % photos.length); };
  const prev = () => { setZoom(false); setIdx((i) => (i - 1 + photos.length) % photos.length); };

  let touchX = 0;
  const onTouchStart = (e) => { touchX = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchX;
    if (dx > 50) prev();
    if (dx < -50) next();
  };

  if (!photos?.length) return null;
  const p = photos[idx];

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex flex-col" data-testid="photo-lightbox">
      <div className="flex items-center justify-between p-4 text-white">
        <span className="text-sm font-medium" data-testid="lightbox-counter">{idx + 1} / {photos.length}</span>
        <button onClick={onClose} data-testid="lightbox-close-btn" className="p-2 rounded-full hover:bg-white/10">
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center relative select-none" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {photos.length > 1 && (
          <button onClick={prev} data-testid="lightbox-prev-btn" className="absolute left-3 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white">
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        <img
          src={fileUrl(p.storage_path)}
          alt=""
          onClick={() => setZoom((z) => !z)}
          className={`max-h-[80vh] max-w-[92vw] object-contain transition-transform duration-300 cursor-zoom-in ${zoom ? "scale-150 cursor-zoom-out" : ""}`}
        />
        {photos.length > 1 && (
          <button onClick={next} data-testid="lightbox-next-btn" className="absolute right-3 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white">
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto p-4 justify-center scroll-thin">
          {photos.map((ph, i) => (
            <img key={ph.id || i} src={fileUrl(ph.storage_path)} onClick={() => { setZoom(false); setIdx(i); }}
              className={`w-16 h-16 object-cover rounded-lg cursor-pointer flex-shrink-0 ${i === idx ? "ring-2 ring-white" : "opacity-50"}`} alt="" />
          ))}
        </div>
      )}
    </div>
  );
}
