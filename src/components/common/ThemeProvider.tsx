"use client";

import { useEffect } from "react";
import { useTripStore } from "@/store/useTripStore";

/**
 * 다크모드 적용
 * - Zustand에 저장된 테마 값을 <html class="dark"> 에 반영한다.
 * - 초기 로드 시 prefers-color-scheme 을 기본값으로 사용한다.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useTripStore((s) => s.theme);
  const setTheme = useTripStore((s) => s.setTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    // 저장된 테마가 없을 때만 시스템 설정을 따른다
    const stored = window.localStorage.getItem("tripcost-store");
    if (stored) return;
    const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(prefers ? "dark" : "light");
  }, [setTheme]);

  return <>{children}</>;
}