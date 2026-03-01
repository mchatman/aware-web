"use client";

type StatusBarProps = {
  connected: boolean;
};

export function StatusBar({ connected }: StatusBarProps) {
  return (
    <div className="status-bar">
      <div className="status-bar__left">
        <span
          className={`status-dot ${connected ? "status-dot--connected" : "status-dot--disconnected"}`}
        />
        <span className="status-bar__text">
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>
    </div>
  );
}
