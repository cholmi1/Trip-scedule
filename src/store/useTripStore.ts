"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_AIRPORT } from "@/lib/data";
import { addDaysIso, minStartDate } from "@/lib/format";
import type { TripRequest } from "@/lib/types";

/** 결과 페이지 탭 */
export type TabKey = "flight" | "stay" | "itinerary" | "transport" | "map" | "budget";

/** 가격 표시 모드 */
export type PriceMode = "total" | "perPerson";

interface TripState {
  /* ── 검색 조건 ── */
  request: TripRequest;
  /** 시트/패널 열림 여부 */
  isSearchOpen: boolean;

  /* ── UI 설정 ── */
  activeTab: TabKey;
  priceMode: PriceMode;
  theme: "light" | "dark";

  /* ── 선택값 ── */
  selectedFlightId: string | null;
  selectedStayId: string | null;

  /* ── 액션 ── */
  setCity: (cityId: string) => void;
  setDates: (start: string, end: string) => void;
  setTravelers: (n: number) => void;
  setBudget: (v: number) => void;
  setRooms: (n: number) => void;
  setDepartureAirport: (code: string, name: string) => void;
  setSearchOpen: (v: boolean) => void;
  setActiveTab: (t: TabKey) => void;
  setPriceMode: (m: PriceMode) => void;
  setTheme: (t: "light" | "dark") => void;
  toggleTheme: () => void;
  selectFlight: (id: string) => void;
  selectStay: (id: string) => void;
  reset: () => void;
}

/** 기본 검색 조건 (오늘 + 30일 출발, 3박 4일, 2인, 150만원) */
function defaultRequest(): TripRequest {
  const start = addDaysIso(minStartDate(), 14);
  return {
    cityId: "tokyo",
    departureAirport: DEFAULT_AIRPORT,
    startDate: start,
    endDate: addDaysIso(start, 3),
    travelers: 2,
    budgetTotal: 1500000,
    rooms: 1,
  };
}

export const useTripStore = create<TripState>()(
  persist(
    (set) => ({
      request: defaultRequest(),
      isSearchOpen: false,
      activeTab: "flight",
      priceMode: "perPerson",
      theme: "light",
      selectedFlightId: null,
      selectedStayId: null,

      setCity: (cityId) => set((s) => ({ request: { ...s.request, cityId } })),
      setDates: (startDate, endDate) =>
        set((s) => ({ request: { ...s.request, startDate, endDate } })),
      setTravelers: (travelers) =>
        set((s) => ({
          request: { ...s.request, travelers, rooms: Math.max(1, Math.ceil(travelers / 2)) },
        })),
      setBudget: (budgetTotal) => set((s) => ({ request: { ...s.request, budgetTotal } })),
      setRooms: (rooms) => set((s) => ({ request: { ...s.request, rooms } })),
      setDepartureAirport: (code, name) =>
        set((s) => ({ request: { ...s.request, departureAirport: { code, name } } })),
      setSearchOpen: (isSearchOpen) => set({ isSearchOpen }),
      setActiveTab: (activeTab) => set({ activeTab }),
      setPriceMode: (priceMode) => set({ priceMode }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),
      selectFlight: (selectedFlightId) => set({ selectedFlightId }),
      selectStay: (selectedStayId) => set({ selectedStayId }),
      reset: () =>
        set({
          request: defaultRequest(),
          isSearchOpen: false,
          activeTab: "flight",
          selectedFlightId: null,
          selectedStayId: null,
        }),
    }),
    {
      name: "tripcost-store",
      // 테마/검색 조건만 영속화 (계획은 다시 계산)
      partialize: (s) => ({
        request: s.request,
        priceMode: s.priceMode,
        theme: s.theme,
        selectedFlightId: s.selectedFlightId,
        selectedStayId: s.selectedStayId,
      }),
    },
  ),
);