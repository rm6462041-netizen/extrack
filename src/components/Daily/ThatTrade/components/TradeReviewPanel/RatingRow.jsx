import React from "react";

export default function RatingRow({ label, score, onChange }) {
  return (
    <div className="flex items-center justify-between gap-2 mt-2.5 text-xs font-semibold text-[var(--text-primary)]">
      <span className="m-0">{label}</span>
      <div className="flex gap-0.5" aria-label={`${score} out of 5`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`p-0 border-0 bg-transparent text-[var(--border-medium)] text-lg leading-none cursor-pointer hover:text-[var(--accent-rating)] transition-colors [&.active]:text-[var(--accent-rating)] ${
              star <= score ? "active" : ""
            }`}
            onClick={() => onChange(star)}
            aria-label={`${label}: ${star} out of 5`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}
