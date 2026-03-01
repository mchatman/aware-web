"use client";

import { GradientProgressBar } from "./GradientProgressBar";

type HeaderProps = {
  assistantName: string;
  active: boolean;
  ttsEnabled: boolean;
  onToggleTts: () => void;
  onLogout?: () => void;
};

export function Header({ assistantName, active, ttsEnabled, onToggleTts, onLogout }: HeaderProps) {
  return (
    <header className="panel-header">
      <div className="panel-header__left">
        <div className="panel-header__icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 8V4H8" />
            <rect width="16" height="12" x="4" y="8" rx="2" />
            <path d="M2 14h2" />
            <path d="M20 14h2" />
            <path d="M15 13v2" />
            <path d="M9 13v2" />
          </svg>
        </div>
        <span className="panel-header__title">{assistantName}</span>
      </div>
      <div className="panel-header__right">
        <button
          className={`panel-header__btn ${ttsEnabled ? "panel-header__btn--active" : ""}`}
          onClick={onToggleTts}
          title={ttsEnabled ? "Disable voice responses" : "Enable voice responses"}
          aria-label="Toggle voice responses"
        >
          {ttsEnabled ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          )}
        </button>
        {onLogout && (
          <button
            className="panel-header__btn"
            onClick={onLogout}
            title="Log out"
            aria-label="Log out"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        )}
      </div>
      <GradientProgressBar active={active} />
    </header>
  );
}
