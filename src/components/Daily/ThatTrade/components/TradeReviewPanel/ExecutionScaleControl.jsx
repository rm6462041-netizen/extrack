import React, { useState, useEffect } from "react";
import { Slider } from "@/components/Common/base";

export default function ExecutionScaleControl({ score, onSave }) {
  const [localScore, setLocalScore] = useState(score);

  useEffect(() => {
    setLocalScore(score);
  }, [score]);

  const label = localScore >= 75 ? "Great" : localScore >= 45 ? "Average" : "Needs work";
  const color = localScore >= 75 ? "var(--accent-success-strong)" : localScore >= 45 ? "var(--accent-rating)" : "var(--accent-danger)";

  return (
    <div className="mt-3.5 pt-3 border-t border-[var(--border-light)]">
      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1">
        <span>Execution Scale</span>
        <strong className="text-xs font-semibold" style={{ color }}>{label} · {localScore}</strong>
      </div>
      <div className="py-2">
        <Slider
          aria-label="Execution Scale"
          minValue={0}
          maxValue={100}
          step={1}
          value={localScore}
          showFillTrack={false}
          trackStyle={{
            background: "linear-gradient(to right, var(--accent-danger), var(--accent-rating) 50%, var(--accent-success-strong))"
          }}
          onChange={(val) => {
            const numVal = Array.isArray(val) ? val[0] : val;
            setLocalScore(numVal);
          }}
          onChangeEnd={(val) => {
            const numVal = Array.isArray(val) ? val[0] : val;
            onSave(numVal);
          }}
        />
      </div>
      <div className="flex items-center justify-between text-xs font-medium mt-1">
        <span className="text-[var(--accent-danger)]">Poor</span>
        <span className="text-[var(--accent-rating)]">Average</span>
        <span className="text-[var(--accent-success-strong)]">Great</span>
      </div>
    </div>
  );
}
