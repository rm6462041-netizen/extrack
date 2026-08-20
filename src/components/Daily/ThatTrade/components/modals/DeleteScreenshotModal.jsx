import React from "react";

export default function DeleteScreenshotModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[var(--overlay-backdrop)] flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-2xl p-6 w-full max-w-[400px] shadow-2xl text-center" onClick={(e) => e.stopPropagation()}>
        <h4 className="text-base font-semibold text-[var(--text-primary)] m-0 mb-2">Delete Screenshot?</h4>
        <p className="text-sm text-[var(--text-secondary)] m-0 mb-5">Are you sure you want to delete this screenshot?</p>
        <div className="flex justify-center gap-3">
          <button className="px-4 py-2 text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-lg hover:bg-[var(--surface-muted)] transition-all cursor-pointer" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="px-4 py-2 text-xs font-medium text-white bg-[var(--accent-danger)] hover:bg-[var(--loss-color)] rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" 
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
