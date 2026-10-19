"use client";
import { Sun, Moon, Monitor } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  return (
    <details
      className="theme-picker"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.currentTarget.open = false;
          e.currentTarget.querySelector("summary")?.focus();
        }
      }}
    >
      <summary className="icon-button" aria-label="Choose color theme">
        <Sun size={19} />
      </summary>
      <div className="theme-options">
        {[
          { key: "light", icon: Sun },
          { key: "dark", icon: Moon },
          { key: "system", icon: Monitor },
        ].map(({ key, icon: Icon }) => (
          <button
            key={key}
            className={mounted && theme === key ? "selected" : ""}
            onClick={() => setTheme(key)}
          >
            <Icon size={16} />
            {key}
          </button>
        ))}
      </div>
    </details>
  );
}
