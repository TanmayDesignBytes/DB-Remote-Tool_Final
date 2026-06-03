import React, { useEffect, useRef, useState } from "react";
import { FiMoon, FiSun } from "react-icons/fi";

const THEME_STORAGE_KEY = "dws.themeMode";

function getInitialMode() {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark"
    ? "dark"
    : "light";
}

function ThemeModeToggle() {
  const [mode, setMode] = useState(getInitialMode);
  const transitionTimeoutRef = useRef(null);
  const isDark = mode === "dark";

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.dataset.theme = mode;
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current && typeof window !== "undefined") {
        window.clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  const handleToggle = () => {
    if (typeof document !== "undefined" && typeof window !== "undefined") {
      document.documentElement.classList.add("theme-transitioning");

      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current);
      }

      transitionTimeoutRef.current = window.setTimeout(() => {
        document.documentElement.classList.remove("theme-transitioning");
        transitionTimeoutRef.current = null;
      }, 560);
    }

    setMode((current) => (current === "dark" ? "light" : "dark"));
  };

  return (
    <button
      type="button"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      aria-pressed={isDark}
      onClick={handleToggle}
      className={`theme-mode-toggle relative z-[75] flex h-[1.875rem] w-[4rem] shrink-0 items-center rounded-[999rem] border border-white/70 p-[0.25rem] shadow-[0_0.5rem_1.25rem_rgba(15,23,42,0.14),inset_0_0_0_0.0625rem_rgba(15,23,42,0.08)] backdrop-blur-[0.5rem] transition-[background-color,border-color,box-shadow,color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2970FF] focus-visible:ring-offset-2 ${
        isDark ? "bg-[#232020]" : "bg-[#F4F7F7]"
      }`}
    >
      <span
        className="absolute left-[0.25rem] top-[0.25rem] z-[2] grid h-[1.375rem] w-[1.375rem] place-items-center rounded-full bg-[#34389B] text-white shadow-[0_0.25rem_0.5rem_rgba(28,35,120,0.28)] transition-[transform,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          transform: isDark ? "translateX(2.125rem)" : "translateX(0)",
        }}
      >
        <FiSun
          strokeWidth={1.5}
          className={`absolute h-[0.8125rem] w-[0.8125rem] transition-[opacity,transform] duration-300 ease-out ${
            isDark ? "scale-75 rotate-45 opacity-0" : "scale-100 rotate-0 opacity-100"
          }`}
        />
        <FiMoon
          strokeWidth={1.5}
          className={`absolute h-[0.8125rem] w-[0.8125rem] transition-[opacity,transform] duration-300 ease-out ${
            isDark ? "scale-100 rotate-0 opacity-100" : "scale-75 -rotate-45 opacity-0"
          }`}
        />
      </span>

      <span
        className={`relative z-[1] grid h-[1.375rem] w-[1.375rem] place-items-center text-[#9CA3AF] transition-opacity duration-300 ${
          isDark ? "opacity-100" : "opacity-0"
        }`}
      >
        <FiSun strokeWidth={1.5} className="h-[0.6875rem] w-[0.6875rem]" />
      </span>
      <span
        className={`relative z-[1] ml-auto grid h-[1.375rem] w-[1.375rem] place-items-center text-[#C7CDD1] transition-opacity duration-300 ${
          isDark ? "opacity-0" : "opacity-100"
        }`}
      >
        <FiMoon strokeWidth={1.5} className="h-[0.6875rem] w-[0.6875rem]" />
      </span>
    </button>
  );
}

export default ThemeModeToggle;
