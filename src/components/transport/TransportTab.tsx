"use client";

import { useState } from "react";
import {
  ArrowRight,
  Bus,
  Car,
  Check,
  Clock,
  Footprints,
  Plane,
  Route,
  Sparkles,
  Train,
  TramFront,
} from "lucide-react";
import { formatKrw } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTripStore } from "@/store/useTripStore";
import type { TransportPass, TripPlan } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Price, PriceModeToggle } from "@/components/common/Price";

const ICONS: Record<TransportPass["icon"], React.ReactNode> = {
  walk: <Footprints className="h-4 w-4" />,
  subway: <Train className="h-4 w-4" />,
  bus: <Bus className="h-4 w-4" />,
  train: <TramFront className="h-4 w-4" />,
  taxi: <Car className="h-4 w-4" />,
};

const ICON_COLOR: Record<TransportPass["icon"], string> = {
  walk: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  subway: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  bus: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  train: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  taxi: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

const MODE_LABEL: { key: TransportPass["icon"]; label: string }[] = [
  { key: "walk", label: "도보" },
  { key: "subway", label: "지하철" },
  { key: "bus", label: "버스" },
  { key: "train", label: "전철" },
  { key: "taxi", label: "택시" },
];

/** 교통 옵션 카드 */
function PassCard({
  pass,
  selected,
  onSelect,
  totalDays,
  travelers,
}: {
  pass: TransportPass;
  selected: boolean;
  onSelect: () => void;
  totalDays: number;
  travelers: number;
}) {
  const effective = pass.billing === "per_day" ? pass.perDayEquivalent * totalDays : pass.price;
  const perPersonDay = Math.round(effective / totalDays);

  return (
    <Card
      onClick={onSelect}
      className={cn(
        "cursor-pointer p-4 transition-all hover:shadow-lift",
        selected && "border-primary ring-2 ring-primary/20",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              ICON_COLOR[pass.icon],
            )}
          >
            {ICONS[pass.icon]}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{pass.name}</p>
            <p className="truncate text-xs text-muted-foreground">{pass.nameEn}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-black tabular-nums text-primary">
            {formatKrw(pass.price)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {pass.billing === "per_day" ? "1인 1일" : "1인 1회"}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="muted" className="gap-1">
          <Clock className="h-3 w-3" /> {pass.durationLabel}
        </Badge>
        {pass.billing === "per_day" && <Badge variant="warning">매일 결제</Badge>}
        {pass.recommended && (
          <Badge variant="brand" className="gap-1">
            <Sparkles className="h-3 w-3" /> 추천
          </Badge>
        )}
      </div>

      <ul className="mt-2.5 space-y-1">
        {pass.covers.map((c) => (
          <li key={c} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <Check className="mt-0.5 h-3 w-3 shrink-0 text-success" />
            {c}
          </li>
        ))}
      </ul>

      <p className="mt-2.5 rounded-md bg-muted/60 px-2.5 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
        {pass.notes}
      </p>

      <div className="mt-3 flex items-center justify-between border-t pt-3">
        <div>
          <Price perPerson={effective} size="sm" className="text-primary" showModeHint />
          <p className="text-[10px] text-muted-foreground">
            1인 하루 {formatKrw(perPersonDay)} · {travelers}명 {formatKrw(effective * travelers)}
          </p>
        </div>
        {selected ? (
          <Badge variant="default" className="gap-1">
            <Check className="h-3 w-3" /> 선택됨
          </Badge>
        ) : (
          <Button size="sm" variant="outline">
            선택
          </Button>
        )}
      </div>
    </Card>
  );
}

/* ── 교통 탭 ────────────────────────────────────────────── */
export function TransportTab({ plan }: { plan: TripPlan }) {
  const setActiveTab = useTripStore((s) => s.setActiveTab);
  const days = plan.days;
  const travelers = plan.request.travelers;

  const [transferId, setTransferId] = useState(plan.transport.chosenIds[0]);
  const [passId, setPassId] = useState(plan.transport.chosenIds[1]);

  const transfer =
    plan.transport.airportTransfers.find((t) => t.id === transferId) ??
    plan.transport.airportTransfers[0];
  const pass =
    plan.transport.cityPasses.find((p) => p.id === passId) ?? plan.transport.cityPasses[0];

  // 선택 조합의 총 교통비 계산
  const transferTotal = transfer.perDayEquivalent * 2;
  const passTotal = pass.billing === "per_day" ? pass.perDayEquivalent * days : pass.price;
  const totalPerPerson = Math.round(transferTotal + passTotal);
  const dailyAvg = Math.round(totalPerPerson / days);

  // 개별권으로 다 샀을 때와 비교 (절약 금액)
  const individualCost = Math.round(plan.city.avgFoodCost * 0.18 * days) + transferTotal * 1.4;
  const saved = Math.max(0, individualCost - totalPerPerson);

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
              {plan.city.airport.nameKo} ↔ {plan.city.downtown.name} · {days}일
            </p>
            <p className="mt-1 text-2xl font-black">
              {formatKrw(totalPerPerson)}
              <span className="ml-1 text-sm font-medium text-white/80">/ 1인 교통비</span>
            </p>
            <p className="mt-1 text-xs text-white/85">
              하루 평균 {formatKrw(dailyAvg)} ·{" "}
              {saved > 0 ? `개별권 대비 ${formatKrw(saved)} 절약` : "가장 저렴한 조합"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PriceModeToggle />
            <Button
              variant="secondary"
              onClick={() => setActiveTab("budget")}
              className="bg-white text-slate-900 hover:bg-white/90"
            >
              예산 보기 <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x sm:grid-cols-4">
          {[
            { label: "공항 왕복", value: formatKrw(transferTotal) },
            { label: "시내 패스", value: formatKrw(passTotal) },
            { label: "하루 평균", value: formatKrw(dailyAvg) },
            { label: "전체 인원", value: formatKrw(totalPerPerson * travelers) },
          ].map((s) => (
            <div key={s.label} className="px-4 py-3">
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
              <p className="mt-0.5 text-sm font-bold tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 이동 수단 시각화 */}
      <Card className="p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Route className="h-4 w-4 text-primary" /> 이동 수단 구성
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {MODE_LABEL.map((m, i) => {
            const counts = plan.itinerary.map((d) =>
              d.parts.reduce(
                (acc, part) =>
                  acc + part.items.filter((it) => it.transport === m.key).length,
                0,
              ),
            );
            const total = counts.reduce((a, b) => a + b, 0);
            return (
              <div key={m.key} className="flex items-center gap-1.5">
                <div
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold",
                    ICON_COLOR[m.key],
                  )}
                >
                  {ICONS[m.key]}
                  {m.label}
                  <span className="rounded-full bg-background/70 px-1.5 text-[10px] font-black">
                    {total}
                  </span>
                </div>
                {i < MODE_LABEL.length - 1 && <span className="text-muted-foreground">·</span>}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          숫자는 {plan.days}일 일정에 포함된 이동 횟수입니다. 1km 미만 구간은 자동으로 도보
          동선으로 바꿔 교통비를 아낍니다.
        </p>
      </Card>

      {/* 공항 → 시내 */}
      <section>
        <h3 className="mb-1 flex items-center gap-2 text-base font-bold">
          <Plane className="h-4 w-4 text-primary" />
          공항 → 시내 이동
        </h3>
        <p className="mb-3 text-xs text-muted-foreground">
          {plan.city.airport.nameKo}에서 {plan.city.downtown.name}까지. Rome2Rio 기준으로 소요 시간과
          요금을 비교했습니다.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {plan.transport.airportTransfers.map((t) => (
            <PassCard
              key={t.id}
              pass={t}
              totalDays={days}
              travelers={travelers}
              selected={t.id === transfer.id}
              onSelect={() => setTransferId(t.id)}
            />
          ))}
        </div>
      </section>

      {/* 시내 패스 */}
      <section>
        <h3 className="mb-1 flex items-center gap-2 text-base font-bold">
          <Train className="h-4 w-4 text-primary" /> 시내 교통패스 비교
        </h3>
        <p className="mb-3 text-xs text-muted-foreground">
          {plan.days}일 일정 기준. 패스를 사면 개별권보다 저렴합니다.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {plan.transport.cityPasses.map((p) => (
            <PassCard
              key={p.id}
              pass={p}
              totalDays={days}
              travelers={travelers}
              selected={p.id === pass.id}
              onSelect={() => setPassId(p.id)}
            />
          ))}
        </div>
      </section>

      {/* 일자별 교통비 */}
      <Card className="p-5">
        <h3 className="mb-3 text-sm font-bold">일자별 교통비 배분</h3>
        <div className="space-y-2">
          {plan.itinerary.map((day) => {
            const row = plan.transport.dailyBreakdown.find((r) => r.day === day.day);
            const value = row?.cost ?? 0;
            const max = Math.max(...plan.transport.dailyBreakdown.map((r) => r.cost), 1);
            return (
              <div key={day.day} className="flex items-center gap-3">
                <span className="w-12 shrink-0 text-xs font-bold text-muted-foreground">
                  Day {day.day}
                </span>
                <div className="h-7 flex-1 overflow-hidden rounded-md bg-muted">
                  <div
                    className="flex h-full items-center rounded-md bg-gradient-to-r from-blue-500 to-cyan-400 px-2 text-[11px] font-bold text-white transition-all"
                    style={{ width: `${20 + (value / max) * 80}%` }}
                  >
                    {row?.label ?? "시내 이동"}
                  </div>
                </div>
                <span className="w-20 shrink-0 text-right text-xs font-bold tabular-nums">
                  {formatKrw(value)}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}