"use client";

import { Pause, Play } from "lucide-react";
import { useId, useState } from "react";

/** A decorative brand illustration, independent of all assessment/model data. */
export function HeartMonitor({ compact = false }: { compact?: boolean }) {
  const [paused, setPaused] = useState(false);
  const gridId = useId().replace(/:/g, "");
  return (
    <div
      className={`heart-monitor ${compact ? "heart-monitor-compact" : ""} ${paused ? "is-paused" : ""}`}
    >
      <div className="monitor-header">
        <span className="monitor-title">A moment for your heart.</span>
        <button
          type="button"
          className="monitor-pause"
          aria-label={
            paused ? "Play decorative animation" : "Pause decorative animation"
          }
          aria-pressed={paused}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? <Play size={13} /> : <Pause size={13} />}
          <span>{paused ? "Play" : "Pause"}</span>
        </button>
      </div>
      <div className="monitor-screen" aria-hidden="true">
        <svg className="monitor-heart" viewBox="0 0 64 64" fill="none">
          <path
            d="M32 54C22 47 10 38 10 25a12 12 0 0 1 22-7 12 12 0 0 1 22 7c0 13-12 22-22 29Z"
            fill="currentColor"
            fillOpacity=".1"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M16 32h10l4-9 5 18 4-9h9"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="monitor-trace-window">
          <svg
            className="monitor-trace"
            viewBox="0 0 640 100"
            preserveAspectRatio="none"
            fill="none"
          >
            <defs>
              <pattern
                id={gridId}
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M20 0H0V20"
                  stroke="currentColor"
                  strokeOpacity=".09"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="640" height="100" fill={`url(#${gridId})`} />
            <path
              className="monitor-wave"
              d="M0 53H56L65 47L74 53H96L106 61L119 16L131 82L144 45L156 53H211L222 47L232 53H320M320 53H376L385 47L394 53H416L426 61L439 16L451 82L464 45L476 53H531L542 47L552 53H640"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
