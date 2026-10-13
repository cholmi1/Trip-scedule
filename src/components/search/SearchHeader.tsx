"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, ChevronDown, MapPin, Plane, Search, Users } from "lucide-react";
import { addDaysIso, minStartDate, nightsBetween, formatDateShort, weekdayKo, formatKrw } from "@/lib/format";
import { CITIES, CITY_MAP, searchCities } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useTripStore } from "@/store/useTripStore";
import { Button } from "@/components/ui/button";
import { Input, Label, Separator } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

/** 검색창에서 먼저 노출하는 추천 도시 */
const POPULAR_CITY_IDS = [
  "tokyo",
  "osaka",
  "bangkok",
  "jeju",
  "singapore",
  "paris",
  "rome",
  "bali",
  "chiangmai",
  "london",
  "barcelona",
];

/* ── 여행지 자동완성 (전체 카탈로그 대상) ───────────────── */
function CityAutocomplete() {
  const cityId = useTripStore((s) => s.request.cityId);
  const setCity = useTripStore((s) => s.setCity);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const city = CITY_MAP[cityId];

  // 검색어가 없으면 추천 도시 + 큐레이션 도시를 먼저 보여준다
  const results = useMemo(() => {
    if (!query.trim()) {
      const popular = POPULAR_CITY_IDS.map((id) => CITY_MAP[id]).filter(Boolean);
      const rest = CITIES.filter((c) => !POPULAR_CITY_IDS.includes(c.id));
      return { popular, rest: rest.slice(0, 60), total: CITIES.length };
    }
    return { popular: [], rest: searchCities(query).slice(0, 80), total: searchCities(query).length };
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <Label className="mb-1.5 flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5" /> 어디로 갈까요
        <span className="ml-auto text-[10px] font-normal">도시 {CITIES.length}곳</span>
      </Label>
      <button
        onClick={() => {
          setOpen((v) => !v);
          setQuery("");
        }}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-lg border bg-background px-3.5 text-left text-sm font-semibold outline-none transition-colors hover:border-primary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-base">{city.emoji}</span>
          <span className="truncate">{city.nameKo}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {city.countryKo}
          </span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-lg border bg-popover shadow-lift">
          <div className="border-b p-2">
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="도시, 국가, 동네, 공항 코드로 검색 (예: 도쿄, 스페인, HND)"
              className="h-9 border-0 bg-muted/50 focus-visible:ring-0"
            />
          </div>

          <div className="max-h-80 overflow-y-auto p-1">
            {results.total === 0 && (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                검색 결과가 없습니다. 다른 도시명이나 국가명으로 검색해 보세요.
              </p>
            )}

            {results.popular.length > 0 && (
              <>
                <p className="px-3 pb-1 pt-2 text-[11px] font-bold text-muted-foreground">
                  지금 많이 찾는 도시
                </p>
                <div className="tc-scroll-x px-2 pb-2">
                  {results.popular.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setCity(c.id);
                        setOpen(false);
                      }}
                      className="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <span>{c.emoji}</span>
                      {c.nameKo}
                      <span className="text-[10px] font-normal text-muted-foreground">
                        {c.countryKo}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="px-3 pb-1 pt-1 text-[11px] font-bold text-muted-foreground">
                  전체 도시
                </p>
              </>
            )}

            {results.rest.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setCity(c.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-accent",
                  c.id === cityId && "bg-accent",
                )}
              >
                <span className="text-xl">{c.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">{c.nameKo}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {c.countryKo}
                    </span>
                    {c.curated ? (
                      <Badge variant="brand" className="shrink-0 px-1.5 py-0 text-[10px]">
                        실제 장소
                      </Badge>
                    ) : (
                      <Badge variant="muted" className="shrink-0 px-1.5 py-0 text-[10px]">
                        일반 가이드
                      </Badge>
                    )}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {c.tagline} · 왕복 약 {Math.round((c.fare ?? 0) / 10000)}만원
                  </span>
                </span>
                {c.id === cityId && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            ))}
          </div>

          <p className="border-t px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
            {results.total}개 도시 · 실제 장소 데이터가 있는 도시는
            &lsquo;실제 장소&rsquo; 배지가 붙습니다. 나머지는 도시 좌표와 비용 기준을 바탕으로
            일반 가이드를 만들어 계산합니다.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── 날짜 선택기 ────────────────────────────────────────── */
function DateRangePicker() {
  const { startDate, endDate } = useTripStore((s) => s.request);
  const setDates = useTripStore((s) => s.setDates);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const min = minStartDate();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const nights = nightsBetween(startDate, endDate);

  return (
    <div ref={boxRef} className="relative">
      <Label className="mb-1.5 flex items-center gap-1.5">
        <CalendarDays className="h-3.5 w-3.5" /> 언제 떠날까요
      </Label>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-lg border bg-background px-3.5 text-left outline-none transition-colors hover:border-primary/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold tabular-nums">
            {formatDateShort(startDate)} ~ {formatDateShort(endDate)}
          </span>
          <span className="block text-[11px] text-muted-foreground">
            {weekdayKo(startDate)} 출발 · {nights}박 {nights + 1}일
          </span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-[min(94vw,22rem)] rounded-lg border bg-popover p-4 shadow-lift">
          <p className="mb-3 text-xs font-semibold text-muted-foreground">
            출발일과 도착일을 선택하세요. 숙박 일수도 자동 계산됩니다.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1">출발일</Label>
              <Input
                type="date"
                value={startDate}
                min={min}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  if (v >= endDate) setDates(v, addDaysIso(v, 1));
                  else setDates(v, endDate);
                }}
              />
            </div>
            <div>
              <Label className="mb-1">도착일</Label>
              <Input
                type="date"
                value={endDate}
                min={addDaysIso(startDate, 1)}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v && v > startDate) setDates(startDate, v);
                }}
              />
            </div>
          </div>

          <Separator className="my-4" />

          <p className="mb-2 text-xs font-semibold text-muted-foreground">빠른 선택</p>
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 6].map((n) => (
              <Button
                key={n}
                size="sm"
                variant={nights === n ? "default" : "outline"}
                onClick={() => setDates(startDate, addDaysIso(startDate, n))}
              >
                {n}박
              </Button>
            ))}
          </div>

          <Button
            className="mt-4 w-full"
            onClick={() => setOpen(false)}
          >
            날짜 적용
          </Button>
        </div>
      )}
    </div>
  );
}

/* ── 인원수 ─────────────────────────────────────────────── */
function TravelersPicker() {
  const travelers = useTripStore((s) => s.request.travelers);
  const setTravelers = useTripStore((s) => s.setTravelers);

  return (
    <div>
      <Label className="mb-1.5 flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5" /> 몇 명이 떠날까요
      </Label>
      <div className="flex h-11 items-center justify-between rounded-lg border bg-background px-2">
        <button
          onClick={() => setTravelers(Math.max(1, travelers - 1))}
          disabled={travelers <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
          aria-label="인원 줄이기"
        >
          −
        </button>
        <span className="text-sm font-bold tabular-nums">
          {travelers}명 {travelers > 2 && <span className="text-xs font-normal text-muted-foreground">({Math.ceil(travelers / 2)}실)</span>}
        </span>
        <button
          onClick={() => setTravelers(Math.min(8, travelers + 1))}
          disabled={travelers >= 8}
          className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
          aria-label="인원 늘리기"
        >
          +
        </button>
      </div>
    </div>
  );
}

/* ── 예산 슬라이더 ──────────────────────────────────────── */
const BUDGET_MIN = 300000;
const BUDGET_MAX = 3000000;
const BUDGET_STEP = 50000;

function BudgetSlider() {
  const budgetTotal = useTripStore((s) => s.request.budgetTotal);
  const travelers = useTripStore((s) => s.request.travelers);
  const setBudget = useTripStore((s) => s.setBudget);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <Label>총 예산</Label>
        <span className="text-sm font-bold tabular-nums text-primary">
          {formatKrw(budgetTotal, { compact: true })}
        </span>
      </div>
      <div className="rounded-lg border bg-background px-3 pb-3 pt-3">
        <Slider
          value={[budgetTotal]}
          min={BUDGET_MIN}
          max={BUDGET_MAX}
          step={BUDGET_STEP}
          onValueChange={([v]) => setBudget(v)}
          aria-label="여행 예산"
        />
        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>30만원</span>
          <span className="font-semibold text-foreground">
            1인당 {formatKrw(Math.round(budgetTotal / travelers))}
          </span>
          <span>300만원</span>
        </div>
      </div>
    </div>
  );
}

/* ── 검색 헤더 ──────────────────────────────────────────── */
interface Props {
  onSearch?: () => void;
  compact?: boolean;
}

export function SearchHeader({ onSearch, compact = false }: Props) {
  const departureAirport = useTripStore((s) => s.request.departureAirport);
  const setDepartureAirport = useTripStore((s) => s.setDepartureAirport);
  const travelers = useTripStore((s) => s.request.travelers);
  const cityId = useTripStore((s) => s.request.cityId);
  const city = CITY_MAP[cityId];

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="brand" className="gap-1">
          <MapPin className="h-3 w-3" /> {city.nameKo}
        </Badge>
        <Badge variant="muted" className="gap-1">
          <CalendarDays className="h-3 w-3" /> {formatDateShort(useTripStore.getState().request.startDate)}
        </Badge>
        <Badge variant="muted" className="gap-1">
          <Users className="h-3 w-3" /> {travelers}명
        </Badge>
        <Badge variant="muted" className="gap-1">
          <Plane className="h-3 w-3" /> {departureAirport.code}
        </Badge>
        <button
          onClick={() => onSearch?.()}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 font-semibold text-primary-foreground transition-colors hover:bg-brand/90"
        >
          <Search className="h-3 w-3" /> 검색 조건 변경
        </button>
      </div>
    );
  }

  return (
    <div className="tc-card p-4 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CityAutocomplete />
        <DateRangePicker />
        <TravelersPicker />
        <BudgetSlider />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
          <Plane className="h-3.5 w-3.5" />
          출발
          <select
            value={departureAirport.code}
            onChange={(e) => {
              const opt = e.target.selectedOptions[0];
              setDepartureAirport(opt.value, opt.text);
            }}
            className="cursor-pointer bg-transparent font-semibold text-foreground outline-none"
          >
            <option value="ICN">ICN 인천국제공항</option>
            <option value="GMP">GMP 김포공항</option>
            <option value="PUS">PUS 부산공항</option>
            <option value="CJU">CJU 제주국제공항</option>
            <option value="TAO">TAO 칭다오공항</option>
          </select>
        </div>
        <span className="text-xs text-muted-foreground">→ {city.airport.nameKo}</span>

        <Button variant="brand" size="lg" onClick={onSearch} className="ml-auto">
          <Search className="h-4 w-4" />
          가성비 계획 짜기
        </Button>
      </div>
    </div>
  );
}