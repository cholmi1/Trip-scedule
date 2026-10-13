"use client";

import { useMemo } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Clock,
  Luggage,
  Plane,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import { formatDateShort, formatFlightDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTripStore } from "@/store/useTripStore";
import type { FlightOffer, TripPlan } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PriceModeToggle } from "@/components/common/Price";

/* ── 출발일 ±3일 최저가 탐색 결과 (막대 차트형) ────────── */
function FlightSearchLog({ plan }: { plan: TripPlan }) {
  const log = plan.flightSearchLog;
  const min = Math.min(...log.map((l) => l.price));
  const max = Math.max(...log.map((l) => l.price));

  return (
    <Card className="p-5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <TrendingDown className="h-4 w-4 text-primary" />
          출발일 ±3일 최저가 탐색
        </h3>
        <span className="text-xs text-muted-foreground">왕복 1인 기준</span>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        요청하신 날짜 주변 7일을 실제로 조회해 가장 싼 날짜를 골랐습니다.
      </p>

      <div className="space-y-1.5">
        {log.map((row) => {
          const ratio = (row.price - min) / Math.max(1, max - min);
          const isPicked = row.date === plan.bestFlight.departureDate;
          return (
            <div key={row.date} className="flex items-center gap-3">
              <span
                className={cn(
                  "w-20 shrink-0 text-xs font-semibold tabular-nums",
                  isPicked ? "text-primary" : "text-muted-foreground",
                )}
              >
                {formatDateShort(row.date)}
                <span className="ml-1">{row.weekday}</span>
              </span>
              <div className="h-6 flex-1 overflow-hidden rounded-md bg-muted">
                <div
                  className={cn(
                    "flex h-full items-center justify-end rounded-md px-2 text-[11px] font-bold text-white transition-all",
                    isPicked
                      ? "bg-gradient-to-r from-brand to-rose-400"
                      : "bg-muted-foreground/40",
                  )}
                  style={{ width: `${35 + ratio * 65}%` }}
                >
                  {(row.price / 10000).toFixed(1)}만
                </div>
              </div>
              <span className="w-16 shrink-0 text-right text-[11px] font-semibold tabular-nums">
                {row.deltaDays === 0 ? (
                  <span className="text-muted-foreground">요청일</span>
                ) : (
                  <span className="text-muted-foreground">
                    {row.deltaDays > 0 ? `+${row.deltaDays}일` : `${row.deltaDays}일`}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-lg bg-brand-soft px-3 py-2.5 text-xs font-semibold text-brand-ink dark:text-brand">
        <Sparkles className="h-4 w-4 shrink-0" />
        최저가는 {formatDateShort(plan.bestFlight.departureDate)} 출발 ·{" "}
        {((log.find((l) => l.deltaDays === 0)?.price ?? 0) - min).toLocaleString()}원 절약
      </div>
    </Card>
  );
}

/* ── 항공편 카드 ────────────────────────────────────────── */
function FlightCard({
  offer,
  selected,
  onSelect,
  rank,
}: {
  offer: FlightOffer;
  selected: boolean;
  onSelect: () => void;
  rank: number;
}) {
  const travelers = useTripStore((s) => s.request.travelers);
  const priceMode = useTripStore((s) => s.priceMode);
  const displayPrice = priceMode === "perPerson" ? offer.pricePerPerson : offer.pricePerPerson * travelers;
  return (
    <Card
      onClick={onSelect}
      className={cn(
        "cursor-pointer p-5 transition-all hover:shadow-lift",
        selected && "border-primary ring-2 ring-primary/20",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-lg text-sm font-black text-white",
              offer.cabin === "lowcost"
                ? "bg-gradient-to-br from-brand to-rose-400"
                : "bg-gradient-to-br from-slate-700 to-slate-500",
            )}
          >
            {offer.airlineCode}
          </span>
          <div>
            <p className="text-sm font-bold">{offer.airline}</p>
            <p className="text-xs text-muted-foreground">{offer.baggage}</p>
          </div>
        </div>
        <div className="text-right">
          {rank === 0 && <Badge variant="brand" className="mb-1">최저가</Badge>}
          <p className="text-2xl font-black tabular-nums text-primary">
            {(displayPrice / 10000).toFixed(1)}
            <span className="ml-0.5 text-sm font-bold">만원</span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            {priceMode === "perPerson" ? "1인 왕복" : `${travelers}명 왕복`}
          </p>
        </div>
      </div>

      {/* 노선 */}
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg bg-muted/50 p-3">
        <div>
          <p className="text-lg font-black tabular-nums">{offer.departTime}</p>
          <p className="text-[11px] text-muted-foreground">
            {offer.fromAirport} · {formatDateShort(offer.departureDate)}
          </p>
        </div>
        <div className="flex min-w-[80px] flex-col items-center">
          <span className="text-[11px] font-semibold text-muted-foreground">
            {formatFlightDuration(offer.durationMin)}
          </span>
          <div className="mt-1 flex w-full items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-border" />
            <span className="h-px flex-1 bg-border" />
            <Plane className="h-3 w-3 rotate-90 text-primary" />
            <span className="h-px flex-1 bg-border" />
            <span className="h-1.5 w-1.5 rounded-full bg-border" />
          </div>
          <span className="mt-1 text-[11px] font-semibold">
            {offer.roundTripDirect ? (
              <span className="text-success">직항</span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400">
                경유 {offer.via.join(", ")}
              </span>
            )}
          </span>
        </div>
        <div className="text-right">
          <p className="text-lg font-black tabular-nums">{offer.arriveTime}</p>
          <p className="text-[11px] text-muted-foreground">{offer.toAirport}</p>
        </div>
      </div>

      {/* 특징 */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant={offer.cabin === "lowcost" ? "warning" : "muted"}>
          {offer.cabin === "lowcost" ? "저가항공" : "일반 항공사"}
        </Badge>
        <Badge variant="muted" className="gap-1">
          <Luggage className="h-3 w-3" /> {offer.baggage}
        </Badge>
        <Badge variant={offer.seatsLeft <= 3 ? "warning" : "muted"}>
          잔여 {offer.seatsLeft}석
        </Badge>
        <Badge variant="muted" className="gap-1">
          <Clock className="h-3 w-3" /> 왕복 {formatDateShort(offer.returnDate)} 귀국
        </Badge>
        <Badge variant="secondary">{offer.source}</Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
        {offer.highlights.map((h) => (
          <span key={h} className="flex items-center gap-1">
            <BadgeCheck className="h-3.5 w-3.5 text-success" /> {h}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {offer.taxesIncluded ? "제과세 포함 · 총액 표시" : "세금 별도"}
        </span>
        {selected ? (
          <Badge variant="default" className="gap-1">
            <BadgeCheck className="h-3 w-3" /> 선택됨
          </Badge>
        ) : (
          <Button size="sm" variant="outline">
            이 항공편 선택 <ArrowRight className="h-3 w-3" />
          </Button>
        )}
      </div>
    </Card>
  );
}

/* ── 항공 탭 ────────────────────────────────────────────── */
export function FlightTab({ plan }: { plan: TripPlan }) {
  const selectedFlightId = useTripStore((s) => s.selectedFlightId);
  const selectFlight = useTripStore((s) => s.selectFlight);
  const setActiveTab = useTripStore((s) => s.setActiveTab);

  // 기본값: 최저가
  const activeId = selectedFlightId ?? plan.flights[0].id;
  const active = plan.flights.find((f) => f.id === activeId) ?? plan.flights[0];

  const summary = useMemo(() => {
    const travelers = plan.request.travelers;
    return {
      perPerson: active.pricePerPerson,
      total: active.pricePerPerson * travelers,
      seats: active.seatsLeft,
    };
  }, [active, plan.request.travelers]);

  return (
    <div className="space-y-5">
      {/* 요약 배너 */}
      <div className="tc-card overflow-hidden">
        <div
          className="flex flex-col gap-4 p-5 text-white sm:flex-row sm:items-center sm:justify-between"
          style={{
            backgroundImage: `linear-gradient(120deg, ${plan.city.gradient[0]}, ${plan.city.gradient[1]})`,
          }}
        >
          <div>
            <p className="text-xs font-medium text-white/80">
              {plan.request.departureAirport.name} → {plan.city.airport.nameKo}
            </p>
            <p className="mt-1 text-2xl font-black">
              {active.pricePerPerson.toLocaleString()}원
              <span className="ml-1 text-sm font-medium text-white/80">/ 1인 왕복</span>
            </p>
            <p className="mt-1 flex items-center gap-2 text-xs text-white/85">
              <span className="rounded-full bg-white/20 px-2 py-0.5">
                {plan.bestFlight.departureDate === plan.request.startDate
                  ? "요청한 날짜가 최저가"
                  : `${plan.bestFlight.departureDate.slice(5).replace("-", "월 ")}일 출발이 최저가`}
              </span>
              <span>{active.roundTripDirect ? "직항 왕복" : "경유 왕복"}</span>
              <span>{active.cabin === "lowcost" ? "저가항공 포함" : "일반 항공사"}</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <PriceModeToggle />
            <Button
              variant="secondary"
              onClick={() => setActiveTab("stay")}
              className="bg-white text-slate-900 hover:bg-white/90"
            >
              숙박 고르기 <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x sm:grid-cols-4">
          {[
            { label: "1인 총액", value: `${active.pricePerPerson.toLocaleString()}원` },
            { label: "전체 총액", value: `${summary.total.toLocaleString()}원` },
            { label: "편도 소요", value: formatFlightDuration(active.durationMin) },
            { label: "가격 출처", value: active.source },
          ].map((s) => (
            <div key={s.label} className="px-4 py-3">
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
              <p className="mt-0.5 text-sm font-bold tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <FlightSearchLog plan={plan} />

      {/* 최저가 3개 비교 */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">가장 싼 항공편 3개 비교</h2>
          <span className="text-xs text-muted-foreground">클릭해서 선택하세요</span>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {plan.flights.map((offer, i) => (
            <FlightCard
              key={offer.id}
              offer={offer}
              rank={i}
              selected={offer.id === activeId}
              onSelect={() => selectFlight(offer.id)}
            />
          ))}
        </div>
      </div>

      {/* 추가 비용 안내 */}
      <Card className="flex items-start gap-3 border-dashed p-4">
        <Briefcase className="h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="text-xs leading-relaxed text-muted-foreground">
          <p className="font-semibold text-foreground">숨은 비용 체크</p>
          <p>
            위 금액은 1인 왕복 기준이며 유류할증료와공항 수수료가 모두 포함된 금액입니다.
            수하물 추가나 좌석 지정은 이 가격에 포함되지 않으므로, 저가항공을 선택할 경우
            1인당 약 2만 원의 부가서비스 비용을 예상해 두세요.
          </p>
        </div>
      </Card>
    </div>
  );
}