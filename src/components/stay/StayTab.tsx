"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Building2,
  Coffee,
  Home,
  MapPin,
  Navigation,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { formatKrw } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTripStore } from "@/store/useTripStore";
import type { StayOption, TripPlan } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Price, PriceModeToggle } from "@/components/common/Price";

const TYPE_ICON: Record<StayOption["type"], React.ReactNode> = {
  hotel: <Building2 className="h-3.5 w-3.5" />,
  guesthouse: <Home className="h-3.5 w-3.5" />,
  airbnb: <Users className="h-3.5 w-3.5" />,
};

const TYPE_VARIANT: Record<StayOption["type"], "default" | "secondary" | "outline"> = {
  hotel: "default",
  guesthouse: "secondary",
  airbnb: "outline",
};

/** 숙소 카드 (Booking.com 스타일) */
function StayCard({
  stay,
  plan,
  selected,
  onSelect,
  isBest,
}: {
  stay: StayOption;
  plan: TripPlan;
  selected: boolean;
  onSelect: () => void;
  isBest: boolean;
}) {
  const nights = plan.nights;
  const travelers = plan.request.travelers;
  const rooms = Math.max(1, Math.ceil(travelers / 2));

  return (
    <Card
      onClick={onSelect}
      className={cn(
        "cursor-pointer overflow-hidden transition-all hover:shadow-lift",
        selected && "border-primary ring-2 ring-primary/20",
      )}
    >
      {/* 썸네일 (그라디언트 카드 UI) */}
      <div
        className="relative flex h-36 items-center justify-center text-5xl"
        style={{
          backgroundImage: `linear-gradient(135deg, ${stay.gradient[0]}, ${stay.gradient[1]})`,
        }}
      >
        <span className="drop-shadow-lg">{stay.emoji}</span>
        <div className="absolute left-3 top-3 flex gap-1.5">
          <Badge variant={TYPE_VARIANT[stay.type]} className="gap-1 bg-white/90 text-slate-900">
            {TYPE_ICON[stay.type]} {stay.typeLabel}
          </Badge>
        </div>
        {isBest && (
          <Badge className="absolute right-3 top-3 gap-1 bg-white/90 text-slate-900">
            <Sparkles className="h-3 w-3" /> 가성비 1위
          </Badge>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold">{stay.name}</h3>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              {stay.district} · 도심에서 {stay.distanceFromCenterKm}km
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="flex items-center justify-end gap-1 rounded-lg bg-secondary px-2 py-1">
              <span className="text-sm font-black text-slate-900">{stay.rating.toFixed(1)}</span>
              <Star className="h-3 w-3 fill-slate-900 text-slate-900" />
            </div>
            <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">
              {stay.scoreLabel}
            </p>
          </div>
        </div>

        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {stay.description}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {stay.amenities.slice(0, 3).map((a) => (
            <Badge key={a} variant="muted">
              {a}
            </Badge>
          ))}
          {stay.breakfastIncluded && (
            <Badge variant="warning" className="gap-1">
              <Coffee className="h-3 w-3" /> 조식 포함
            </Badge>
          )}
          {stay.freeCancellation && (
            <Badge variant="success" className="gap-1">
              <BadgeCheck className="h-3 w-3" /> 무료 취소
            </Badge>
          )}
          {stay.synthetic && <Badge variant="muted">일반 가이드</Badge>}
        </div>

        <div className="mt-4 flex items-end justify-between border-t pt-3">
          <div>
            <Price
              perPerson={stay.pricePerNight}
              size="lg"
              className="text-primary"
              showModeHint
            />
            <p className="text-[11px] text-muted-foreground">
              {formatKrw(stay.pricePerNight)} / 2인 1박 기준
            </p>
          </div>
          {selected ? (
            <Badge variant="default" className="gap-1">
              <BadgeCheck className="h-3 w-3" /> 선택됨
            </Badge>
          ) : (
            <Button size="sm" variant="outline">
              선택
            </Button>
          )}
        </div>

        {/* 총 숙박비 */}
        <div className="mt-2 flex items-center justify-between rounded-lg bg-brand-soft px-3 py-2 text-xs dark:bg-brand/15">
          <span className="font-semibold text-brand-ink dark:text-brand">
            {nights}박 {rooms}실 총액
          </span>
          <Price
            perPerson={stay.pricePerNight * nights * rooms}
            size="sm"
            className="text-brand-ink dark:text-brand"
          />
        </div>
      </div>
    </Card>
  );
}

/* ── 숙박 탭 ────────────────────────────────────────────── */
export function StayTab({ plan }: { plan: TripPlan }) {
  const selectedStayId = useTripStore((s) => s.selectedStayId);
  const selectStay = useTripStore((s) => s.selectStay);
  const setActiveTab = useTripStore((s) => s.setActiveTab);
  const [filter, setFilter] = useState<"all" | StayOption["type"]>("all");

  const activeId = selectedStayId ?? plan.stay.id;
  const active = plan.stays.find((s) => s.id === activeId) ?? plan.stay;

  // 가성비 1위(추천)를 맨 앞에, 나머지는 평점·가격 순으로 노출
  const list = useMemo(() => {
    const filtered = plan.stays.filter((s) => filter === "all" || s.type === filter);
    const rec = filtered.find((s) => s.id === plan.stay.id);
    return rec ? [rec, ...filtered.filter((s) => s.id !== rec.id)] : filtered;
  }, [plan.stays, plan.stay.id, filter]);

  const nights = plan.nights;
  const travelers = plan.request.travelers;
  const rooms = Math.max(1, Math.ceil(travelers / 2));

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
              {nights}박 {rooms}실 · 도심 {plan.city.downtown.name} 기준
            </p>
            <p className="mt-1 text-2xl font-black">
              {formatKrw(active.pricePerNight * nights * rooms)}
              <span className="ml-1 text-sm font-medium text-white/80">총 숙박비</span>
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/85">
              <span className="rounded-full bg-white/20 px-2 py-0.5">
                1박 {formatKrw(active.pricePerNight)}
              </span>
              <span className="rounded-full bg-white/20 px-2 py-0.5">
                1인 {formatKrw(active.pricePerNight * nights)}원
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PriceModeToggle />
            <Button
              variant="secondary"
              onClick={() => setActiveTab("itinerary")}
              className="bg-white text-slate-900 hover:bg-white/90"
            >
              일정 짜기 <Navigation className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { key: "all", label: "전체" },
            { key: "hotel", label: "호텔" },
            { key: "guesthouse", label: "게스트하우스" },
            { key: "airbnb", label: "에어비앤비" },
          ] as const
        ).map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? "default" : "outline"}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          평점 8.0 이상 · 도심 1km 이내 우선 {list.length}개
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((stay) => (
          <StayCard
            key={stay.id}
            stay={stay}
            plan={plan}
            selected={stay.id === activeId}
            isBest={stay.id === plan.stay.id}
            onSelect={() => selectStay(stay.id)}
          />
        ))}
      </div>

      {/* 숙박 위치 요약 */}
      <Card className="p-5">
        <h3 className="mb-3 text-sm font-bold">선택한 숙소 요약</h3>
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/50 p-3">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-lg text-2xl"
            style={{
              backgroundImage: `linear-gradient(135deg, ${active.gradient[0]}, ${active.gradient[1]})`,
            }}
          >
            {active.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{active.name}</p>
            <p className="text-xs text-muted-foreground">
              {active.district} · {active.distanceFromCenterKm}km · 평점{" "}
              {active.rating.toFixed(1)} / 10
            </p>
          </div>
          <div className="text-right">
            <Price perPerson={active.pricePerNight * nights * rooms} size="lg" className="text-primary" />
            <p className="text-[11px] text-muted-foreground">{nights}박 {rooms}실 합계</p>
          </div>
        </div>
      </Card>
    </div>
  );
}