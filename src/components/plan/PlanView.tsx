"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  BedDouble,
  CalendarDays,
  Map as MapIcon,
  Moon,
  Plane,
  Search,
  Sparkles,
  Sun,
  TrendingUp,
  Wallet,
  Route,
} from "lucide-react";
import { buildTripPlan } from "@/lib/engine";
import { formatKrw, tripLengthLabel } from "@/lib/format";
import { CITY_MAP } from "@/lib/data";
import { useTripStore, type TabKey } from "@/store/useTripStore";
import { SearchHeader } from "@/components/search/SearchHeader";
import { FlightTab } from "@/components/flight/FlightTab";
import { StayTab } from "@/components/stay/StayTab";
import { ItineraryTab } from "@/components/itinerary/ItineraryTab";
import { TransportTab } from "@/components/transport/TransportTab";
import { BudgetTab } from "@/components/budget/BudgetTab";
import { ExportMenu } from "@/components/common/ExportMenu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* Leaflet 는 window 에 의존하므로 클라이언트에서만 로드 */
const ItineraryMap = dynamic(
  () => import("@/components/map/ItineraryMap"),
  {
    ssr: false,
    loading: () => (
      <div className="tc-card flex h-[420px] items-center justify-center text-sm text-muted-foreground">
        지도를 불러오는 중입니다…
      </div>
    ),
  },
);

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "flight", label: "항공", icon: <Plane className="h-3.5 w-3.5" /> },
  { key: "stay", label: "숙박", icon: <BedDouble className="h-3.5 w-3.5" /> },
  { key: "itinerary", label: "일정·관광", icon: <CalendarDays className="h-3.5 w-3.5" /> },
  { key: "transport", label: "현지 교통", icon: <Route className="h-3.5 w-3.5" /> },
  { key: "map", label: "지도", icon: <MapIcon className="h-3.5 w-3.5" /> },
  { key: "budget", label: "예산 대시보드", icon: <Wallet className="h-3.5 w-3.5" /> },
];

export default function PlanView() {
  const router = useRouter();
  const request = useTripStore((s) => s.request);
  const activeTab = useTripStore((s) => s.activeTab);
  const setActiveTab = useTripStore((s) => s.setActiveTab);
  const theme = useTripStore((s) => s.theme);
  const toggleTheme = useTripStore((s) => s.toggleTheme);
  const [searchOpen, setSearchOpen] = useState(false);

  // 요청이 바뀔 때마다 계획을 다시 계산
  const plan = useMemo(() => buildTripPlan(request), [request]);
  const city = CITY_MAP[plan.city.id];

  return (
    <div className="min-h-dvh bg-background">
      {/* 상단 바 */}
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
        <div className="container flex h-14 items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 font-black tracking-tight"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-rose-400 text-sm text-white">
              T
            </span>
            TripCost
          </button>

          <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            {city.emoji} {city.nameKo} · {tripLengthLabel(plan.nights)} ·{" "}
            {request.travelers}명
          </span>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleTheme}
              aria-label="다크모드 전환"
            >
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            <ExportMenu plan={plan} />
            <Button variant="outline" size="sm" onClick={() => setSearchOpen(true)} className="gap-1.5">
              <Search className="h-3.5 w-3.5" /> 조건 변경
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6">
        {/* 요약 헤더 */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Badge variant="brand" className="mb-2 gap-1">
              <Sparkles className="h-3 w-3" /> 가성비 점수 {plan.valueScore}
            </Badge>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              {city.emoji} {city.nameKo} {tripLengthLabel(plan.nights)} 여행 계획
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{city.tagline}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              {
                icon: <Plane className="h-3.5 w-3.5" />,
                label: "항공",
                value: formatKrw(plan.bestFlight.pricePerPerson),
              },
              {
                icon: <BedDouble className="h-3.5 w-3.5" />,
                label: "숙박",
                value: formatKrw(plan.stay.pricePerNight * plan.nights),
              },
              {
                icon: <Route className="h-3.5 w-3.5" />,
                label: "교통",
                value: formatKrw(plan.transport.totalPerPerson),
              },
              {
                icon: <TrendingUp className="h-3.5 w-3.5" />,
                label: "총액",
                value: formatKrw(plan.budget.totalTotal, { compact: true }),
              },
            ].map((s) => (
              <div key={s.label} className="tc-card px-3 py-2.5">
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  {s.icon} {s.label}
                </p>
                <p className="text-sm font-bold tabular-nums">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 탭 */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="gap-1.5">
                {t.icon}
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div id="tripcost-export-area">
            <TabsContent value="flight">
              <FlightTab plan={plan} />
            </TabsContent>
            <TabsContent value="stay">
              <StayTab plan={plan} />
            </TabsContent>
            <TabsContent value="itinerary">
              <ItineraryTab plan={plan} />
            </TabsContent>
            <TabsContent value="transport">
              <TransportTab plan={plan} />
            </TabsContent>
            <TabsContent value="map">
              <ItineraryMap plan={plan} />
            </TabsContent>
            <TabsContent value="budget">
              <BudgetTab plan={plan} />
            </TabsContent>
          </div>
        </Tabs>
      </main>

      <footer className="container py-8 text-center text-xs text-muted-foreground">
        TripCost · 데이터는 데모용 목 데이터입니다. 실제 서비스에서 Skyscanner·Amadeus·Google
        Places·Booking API로 교체됩니다.
      </footer>

      {/* 검색 조건 변경 모달 */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>여행 조건 변경</DialogTitle>
            <DialogDescription>
              조건을 바꾸면 항공편·숙박·일정·예산이 즉시 다시 계산됩니다.
            </DialogDescription>
          </DialogHeader>
          <SearchHeader compact={false} onSearch={() => setSearchOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}