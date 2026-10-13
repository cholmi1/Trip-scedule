"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search, Sparkles } from "lucide-react";
import { addDaysIso, formatKrw } from "@/lib/format";
import { CITIES, CURATED_CITIES, searchCities } from "@/lib/data";
import { buildTripPlan } from "@/lib/engine";
import { cn } from "@/lib/utils";
import { useTripStore } from "@/store/useTripStore";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const REGIONS = [
  "전체",
  "국내·한반도",
  "일본",
  "대만·중국",
  "동남아",
  "남아·인도",
  "중동",
  "유럽",
  "아메리카",
  "오세아",
] as const;

/** 국가 → 지역 그룹 */
function regionOf(countryEn: string): (typeof REGIONS)[number] {
  if (["South Korea"].includes(countryEn)) return "국내·한반도";
  if (countryEn === "Japan") return "일본";
  if (["Taiwan", "China", "Hong Kong", "Macau"].includes(countryEn)) return "대만·중국";
  if (
    ["Singapore", "Malaysia", "Thailand", "Vietnam", "Philippines", "Indonesia", "Cambodia", "Laos", "Myanmar"].includes(countryEn)
  )
    return "동남아";
  if (["India", "Nepal", "Mongolia", "Sri Lanka"].includes(countryEn)) return "남아·인도";
  if (["UAE", "Qatar", "Saudi", "Egypt", "Morocco", "Turkey"].includes(countryEn)) return "중동";
  if (
    ["Spain", "Portugal", "France", "Italy", "Greece", "Netherlands", "Belgium", "Germany", "Switzerland", "Austria", "Croatia", "Hungary", "Czechia", "Poland", "Denmark", "Sweden", "Norway", "Finland", "Iceland", "United Kingdom", "Ireland"].includes(countryEn)
  )
    return "유럽";
  if (["United States", "Canada", "Mexico", "Cuba", "Brazil", "Argentina", "Chile", "Peru", "Colombia"].includes(countryEn))
    return "아메리카";
  return "오세아";
}

/** 지역별 목적지 브라우저 */
export function DestinationsBrowser() {
  const router = useRouter();
  const departureAirport = useTripStore((s) => s.request.departureAirport);
  const setCity = useTripStore((s) => s.setCity);
  const setDates = useTripStore((s) => s.setDates);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<(typeof REGIONS)[number]>("전체");

  const list = useMemo(() => {
    const base = query.trim() ? searchCities(query) : CITIES;
    if (region === "전체") return base;
    return base.filter((c) => regionOf(c.countryEn) === region);
  }, [query, region]);

  /** 도시별 예상 총액 (필터 변경 시 재계산되지 않도록 한 번만 계산) */
  const totals = useMemo(() => {
    const start = addDaysIso(new Date().toISOString().slice(0, 10), 30);
    const map: Record<string, number> = {};
    CITIES.forEach((c) => {
      map[c.id] = buildTripPlan({
        cityId: c.id,
        departureAirport,
        startDate: start,
        endDate: addDaysIso(start, 3),
        travelers: 2,
        budgetTotal: 1500000,
        rooms: 1,
      }).budget.totalTotal;
    });
    return map;
  }, [departureAirport]);

  function open(cityId: string) {
    const start = addDaysIso(new Date().toISOString().slice(0, 10), 30);
    setCity(cityId);
    setDates(start, addDaysIso(start, 3));
    router.push("/plan");
  }

  return (
    <div>
      {/* 검색 + 지역 필터 */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="도시나 국가로 검색 (예: 오사카, 스페인)"
            className="pl-9"
          />
        </div>
        <div className="tc-scroll-x">
          {REGIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                region === r
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* 카드 그리드 */}
      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          검색 결과가 없습니다.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {list.map((c) => (
            <button
                key={c.id}
                onClick={() => open(c.id)}
                className="group overflow-hidden rounded-lg border bg-card text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
              >
                <div
                  className="relative flex h-20 items-end p-3"
                  style={{
                    backgroundImage: `linear-gradient(120deg, ${c.gradient[0]}, ${c.gradient[1]})`,
                  }}
                >
                  <span className="absolute right-2.5 top-1.5 text-3xl opacity-90 transition-transform group-hover:scale-110">
                    {c.emoji}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-white">{c.nameKo}</p>
                    <p className="truncate text-[10px] text-white/85">{c.countryKo}</p>
                  </div>
                </div>
                <div className="p-2.5">
                  <p className="truncate text-[11px] text-muted-foreground">{c.tagline}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold tabular-nums text-primary">
                      왕복 약 {Math.round((c.fare ?? 0) / 10000)}만원
                    </span>
                    {c.curated ? (
                      <Badge variant="brand" className="px-1.5 py-0 text-[10px]">
                        실제 장소
                      </Badge>
                    ) : (
                      <Badge variant="muted" className="px-1.5 py-0 text-[10px]">
                        일반 가이드
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1.5 flex items-center gap-1 border-t pt-1.5 text-[11px] font-semibold text-muted-foreground">
                    <Sparkles className="h-3 w-3" />
                    3박4일 2인 약 {formatKrw(totals[c.id] ?? 0, { compact: true })}
                    <ArrowRight className="ml-auto h-3 w-3 text-primary" />
                  </p>
                </div>
              </button>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        전체 {CITIES.length}곳 중 {list.length}곳을 표시 중입니다. 큐레이션 도시{" "}
        {CURATED_CITIES.length}곳은 실제 장소 데이터 기반, 나머지는 도시 좌표·비용 기준 일반
        가이드입니다.
      </p>
    </div>
  );
}