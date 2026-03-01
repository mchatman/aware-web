"use client";

export function GradientProgressBar({ active }: { active: boolean }) {
  return (
    <div className="gradient-progress-bar-track">
      <div
        className={`gradient-progress-bar-fill ${active ? "gradient-progress-bar-fill--active" : ""}`}
      />
    </div>
  );
}
