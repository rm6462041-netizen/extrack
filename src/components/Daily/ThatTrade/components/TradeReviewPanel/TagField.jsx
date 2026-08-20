import React, { useState, useEffect, useRef } from "react";
import { Tag } from "@/components/Common/base";
import { TagGroup, TagList } from "@/components/Common/base/tags/tags";

export default function TagField({ label, value, tone, options = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [customTag, setCustomTag] = useState("");
  const fieldRef = useRef(null);
  const tags = String(value || "").split(",").map((tag) => tag.trim()).filter(Boolean);
  const update = (nextTags) => onChange(nextTags.join(", "));
  const addTag = (tag) => {
    const cleanTag = tag.trim().slice(0, 40);
    if (!cleanTag || tags.some((item) => item.toLowerCase() === cleanTag.toLowerCase())) return;
    update([...tags, cleanTag]);
    setCustomTag("");
  };
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (!fieldRef.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div ref={fieldRef} className="mt-2.5">
      <span className="block mb-1 text-[var(--text-primary)] text-xs font-semibold">{label}</span>
      <div className="relative min-h-[38px] p-1.5 border border-[var(--border-light)] rounded-md bg-[var(--bg-secondary)]">
        <div>
          {tags.length > 0 ? (
            <TagGroup label={label} size="sm">
              <TagList className="flex flex-wrap gap-1">
                {tags.map((tag) => {
                  const dotColorClass =
                    tone === "setup"
                      ? "text-fg-success-secondary"
                      : tone === "mistake"
                      ? "text-fg-error-primary"
                      : "text-fg-tertiary";

                  return (
                    <Tag
                      key={tag}
                      id={tag}
                      dot
                      dotClassName={dotColorClass}
                      onClose={() => update(tags.filter((item) => item !== tag))}
                    >
                      {tag.replaceAll("_", " ")}
                    </Tag>
                  );
                })}
              </TagList>
            </TagGroup>
          ) : null}
        </div>
        <button
          className="flex w-full items-center justify-between mt-1 p-1 border-0 outline-none bg-transparent text-[var(--text-secondary)] text-xs cursor-pointer hover:text-[var(--text-primary)] transition-colors"
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
        >
          <span>{tags.length ? `Add ${label}` : `Select ${label}`}</span>
          <span aria-hidden="true">⌄</span>
        </button>
        {open && (
          <div className="absolute z-20 top-[calc(100%+4px)] inset-x-0 p-2 border border-[var(--border-medium)] rounded-lg bg-[var(--surface-elevated)] shadow-lg">
            <div className="flex gap-1.5 mb-2">
              <input
                className="min-w-0 flex-1 px-2 py-1.5 border border-[var(--border-light)] rounded-md outline-none bg-[var(--surface-subtle)] text-[var(--text-primary)] text-xs focus:border-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)]"
                value={customTag}
                maxLength={40}
                placeholder={`Create ${label}`}
                onChange={(event) => setCustomTag(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") addTag(customTag);
                }}
              />
              <button
                className="px-2.5 py-1.5 border border-[color-mix(in_srgb,var(--accent-success-strong)_34%,var(--button-bg)_66%)] rounded-md bg-gradient-to-br from-[var(--button-bg)] to-[color-mix(in_srgb,var(--button-bg)_76%,var(--accent-success-strong)_24%)] text-[var(--button-text)] text-xs font-medium cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                type="button"
                onClick={() => addTag(customTag)}
                disabled={!customTag.trim()}
              >
                Add
              </button>
            </div>
            <div className="flex max-h-[120px] flex-wrap gap-1.5 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <TagGroup label={`Select ${label}`} size="sm">
                <TagList className="flex flex-wrap gap-1">
                  {options.filter((option) => !tags.includes(option)).map((option, idx) => (
                    <Tag
                      key={option}
                      id={`opt-${idx}`}
                      dot
                      dotClassName={
                        tone === "setup"
                          ? "text-fg-success-secondary"
                          : tone === "mistake"
                          ? "text-fg-error-primary"
                          : "text-fg-tertiary"
                      }
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => addTag(option)}
                    >
                      {option}
                    </Tag>
                  ))}
                </TagList>
              </TagGroup>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
