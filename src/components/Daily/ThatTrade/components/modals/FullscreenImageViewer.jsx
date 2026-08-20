import React from "react";

export default function FullscreenImageViewer({ isOpen, onClose, imageUrl }) {
  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-[2000] bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-2xl transition-all cursor-pointer border-0" onClick={onClose}>×</button>
      <img className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl" src={imageUrl} alt="Screenshot" />
    </div>
  );
}
