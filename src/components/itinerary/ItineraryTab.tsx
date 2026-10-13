"use client";

import {
  Clock,
  Coffee,
  Footprints,
  Landmark,
  MapPin,
  Navigation,
  Sparkles,
  Ticket,
  Train,
  Bus,
  Car,
} from "lucide-react";
import { formatDuration, formatKrw } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTripStore } from "@/store/useTripStore";
import type { ItineraryItem, TripPlan } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Price, PriceModeToggle } from "@/components/common/Price";

/** 이동 수단 아이콘 */
const MOVE_ICON: Record<ItineraryItem["transport"], React.ReactNode> = {
  walk: <Footprints className="h-3.5 w-3.5" />,
  subway: <Train className="h-3.5 w-3.5" />,
  bus: <Bus className="h-3.5 w-3.5" />,
  train: <Train className="h-3.5 w-3.5" />,
  taxi: <Car className="h-3.5 w-3.5" />,
};

/** 장소 카테고리 아이콘 */
function CategoryIcon({ category }: { category: string }) {
  if (category === "restaurant") return <span>🍽️</span>;
  if (category === "cafe") return <Coffee className="h-4 w-4" />;
  if (category === "shopping") return <span>🛍️</span>;
  return <Landmark className="h-4 w-4" />;
}

/** 일정 한 항목 카드 */
function ItemCard({ item, isFirst }: { item: ItineraryItem; isFirst: boolean }) {
  const p = item.place;
  return (
    <div className="relative pl-8">
      {/* 타임라인 점 */}
      <span
        className="absolute left-0 top-5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary bg-background text-[10px] font-black"
        aria-hidden
      >
        {p.emoji.slice(0, 2)}
      </span>

      <Card
        className={cn(
          "overflow-hidden transition-shadow hover:shadow-lift",
          isFirst && "border-primary/40",
        )}
      >
        <div className="flex">
          {/* 썸네일 */}
          <div
            className="hidden w-20 shrink-0 items-center justify-center text-3xl sm:flex"
            style={{
              backgroundImage: `linear-gradient(135deg, ${p.gradient[0]}, ${p.gradient[1]})`,
            }}
          >
            {p.emoji}
          </div>

          <div className="min-w-0 flex-1 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={p.category === "attraction" ? "default" : "secondary"} className="gap-1">
                    <CategoryIcon category={p.category} />
                    {p.categoryLabel}
                  </Badge>
                  <Badge variant="muted" className="gap-1">
                    <Clock className="h-3 w-3" /> {formatDuration(p.durationMin)}
                  </Badge>
                  {p.ticketPrice > 0 && (
                    <Badge variant="warning" className="gap-1">
                      <Ticket className="h-3 w-3" /> 입장 {formatKrw(p.ticketPrice)}
                    </Badge>
                  )}
                  {p.mealCost > 0 && (
                    <Badge variant="brand" className="gap-1">
                      1인 약 {formatKrw(p.mealCost)}
                    </Badge>
                  )}
                </div>
                <h4 className="mt-1.5 truncate text-sm font-bold">{p.name}</h4>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{p.address}</span>
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-black tabular-nums text-primary">
                  {(p.rating ?? 0).toFixed(1)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  리뷰 {(p.reviewCount ?? 0).toLocaleString()}
                </p>
              </div>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{p.description}</p>

            {p.tip && (
              <p className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] leading-relaxed text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
                {p.tip}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-2.5 text-[11px] text-muted-foreground">
              <span className="font-semibold tabular-nums text-foreground">
                {item.startTime} - {item.endTime}
              </span>
              {!isFirst && (
                <span className="flex items-center gap-1">
                  {MOVE_ICON[item.transport]}
                  {item.transportLabel} {item.travelMin}분 · {item.distanceKm}km
                </span>
              )}
              {p.bestTime && <span className="ml-auto">추천 {p.bestTime}</span>}
                  {p.synthetic && (
                    <Badge variant="muted" className="shrink-0">
                      일반 가이드
                    </Badge>
                  )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ── 일정 & 관광 탭 ─────────────────────────────────────── */
export function ItineraryTab({ plan }: { plan: TripPlan }) {
  const setActiveTab = useTripStore((s) => s.setActiveTab);
  const totalCost = plan.itinerary.reduce((s, d) => s + d.costPerPerson, 0);
  const totalPlaces = plan.itinerary.reduce(
    (s, d) => s + d.parts.reduce((a, p) => a + p.items.length, 0),
    0,
  );
  const totalDistance = plan.itinerary.reduce((s, d) => s + d.totalDistanceKm, 0);

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
              {plan.city.nameKo} {plan.nights}박 {plan.days}일 동선
            </p>
            <p className="mt-1 text-2xl font-black">
              {totalPlaces}곳
              <span className="ml-1 text-sm font-medium text-white/80">관광 · 식사 · 카페</span>
            </p>
            <p className="mt-1 text-xs text-white/85">
              하루 평균 이동 {Math.round(totalDistance / plan.days)}km · 일일 예산{" "}
              {formatKrw(totalCost / plan.days)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PriceModeToggle />
            <Button
              variant="secondary"
              onClick={() => setActiveTab("map")}
              className="bg-white text-slate-900 hover:bg-white/90"
            >
              지도로 보기 <Navigation className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 하루별 타임라인 */}
      <div className="space-y-8">
        {plan.itinerary.map((day) => (
          <section key={day.day}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b pb-3">
              <div>
                <h3 className="flex items-center gap-2 text-base font-black">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                    {day.day}
                  </span>
                  {day.theme}
                </h3>
                <p className="ml-9 text-xs text-muted-foreground">{day.dateLabel}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="muted" className="gap-1">
                  <Navigation className="h-3 w-3" /> {day.totalDistanceKm}km
                </Badge>
                <Price
                  perPerson={day.costPerPerson}
                  size="sm"
                  className="text-primary"
                  showModeHint
                />
              </div>
            </div>

            <div className="space-y-5">
              {day.parts.map((part) =>
                part.items.length === 0 ? (
                  <div
                    key={part.part}
                    className="flex items-center gap-3 rounded-lg border border-dashed p-4 text-xs text-muted-foreground"
                  >
                    <span className="text-base">{part.label}</span>
                    자유 일정 · 주변 산책을 권합니다
                  </div>
                ) : (
                  <div key={part.part}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-xs font-bold">{part.label}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {part.timeRange}
                      </span>
                    </div>
                    <div className="space-y-3 border-l-2 border-dashed border-border pl-0">
                      {part.items.map((item, i) => (
                        <ItemCard key={`${day.day}-${part.part}-${item.place.id}`} item={item} isFirst={i === 0} />
                      ))}
                    </div>
                  </div>
                ),
              )}
            </div>
          </section>
        ))}
      </div>

      {/* Google Places 연동 안내 */}
      <Card className="flex items-start gap-3 border-dashed p-4">
        <MapPin className="h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="text-xs leading-relaxed text-muted-foreground">
          <p className="font-semibold text-foreground">Google Places 연동 안내</p>
          <p>
            현재 장소 정보는 목 데이터 기반이며, <code className="rounded bg-muted px-1">GOOGLE_PLACES_KEY</code>{" "}
            를 설정하면 실제 장소 평점·영업시간·사진으로 교체됩니다. 점심은 현지 맛집,
            저녁은 가성비 이자카야와 로컬 식당으로 자동 배치됩니다.
          </p>
        </div>
      </Card>
    </div>
  );
}