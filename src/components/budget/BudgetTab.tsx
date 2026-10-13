"use client";

import {
  AlertTriangle,
  CheckCircle2,
  PiggyBank,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatKrw } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TripPlan } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Price, PriceModeToggle } from "@/components/common/Price";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
];

/** 차트 툴팁 */
function ChartTip({
  active,
  payload,
  label,
  suffix = "원",
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-lift">
      {label && <p className="mb-1 font-bold">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="ml-auto font-bold tabular-nums">
            {Math.round(p.value).toLocaleString()}
            {suffix}
          </span>
        </p>
      ))}
    </div>
  );
}

/* ── 예산 대시보드 ──────────────────────────────────────── */
export function BudgetTab({ plan }: { plan: TripPlan }) {
  const budget = plan.budget;
  const items = budget.items;

  /** 파이차트 데이터 (비율 %) */
  const pieData = items.map((i) => ({
    name: i.label,
    value: i.perPerson,
    ratio: Number(((i.perPerson / budget.totalPerPerson) * 100).toFixed(1)),
  }));

  /** 막대그래드: 실제 vs 권장 비중 */
  const barData = [
    {
      name: "권장 비중",
      data: items.map((i) => ({
        label: i.label,
        실제비율: Number(((i.perPerson / budget.totalPerPerson) * 100).toFixed(1)),
        권장비율: i.targetRatio,
      })),
    },
  ];

  const avgScore = plan.valueScore;

  return (
    <div className="space-y-5">
      {/* 총 예산 vs 예상 경비 */}
      <div className="tc-card overflow-hidden">
        <div
          className="flex flex-col gap-4 p-5 text-white sm:flex-row sm:items-center sm:justify-between"
          style={{
            backgroundImage: `linear-gradient(120deg, ${plan.city.gradient[0]}, ${plan.city.gradient[1]})`,
          }}
        >
          <div>
            <p className="text-xs font-medium text-white/80">
              {plan.days}일 {plan.request.travelers}명 총 예상 경비
            </p>
            <p className="mt-1 text-3xl font-black tabular-nums">
              {formatKrw(budget.totalTotal)}
            </p>
            <p className="mt-1 text-xs text-white/85">
              1인 기준 {formatKrw(budget.totalPerPerson)} · 예산{" "}
              {formatKrw(budget.budgetTotal)}
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <PriceModeToggle />
            <div
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-bold",
                budget.isOver ? "bg-white text-rose-600" : "bg-white text-emerald-600",
              )}
            >
              {budget.isOver
                ? `예산 초과 ${formatKrw(Math.abs(budget.remainingPerPerson))}`
                : `예산 내 ${formatKrw(budget.remainingPerPerson)} 여유`}
            </div>
          </div>
        </div>

        {/* 예산 사용률 게이지 */}
        <div className="p-5">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-muted-foreground">예산 사용률</span>
            <span className="font-bold tabular-nums">{budget.usageRatio}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                budget.isOver
                  ? "bg-gradient-to-r from-amber-500 to-rose-500"
                  : "bg-gradient-to-r from-emerald-400 to-teal-500",
              )}
              style={{ width: `${Math.min(100, budget.usageRatio)}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>0원</span>
            <span>예산 {formatKrw(budget.budgetTotal)}</span>
          </div>
        </div>
      </div>

      {/* 카테고리 카드 */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item, i) => {
          const actualRatio = (item.perPerson / budget.totalPerPerson) * 100;
          const diff = item.targetRatio - actualRatio;
          return (
            <Card key={item.category} className="p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-bold">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: CHART_COLORS[i] }}
                  />
                  {item.label}
                </span>
                <Badge variant="muted">권장 {item.targetRatio}%</Badge>
              </div>
              <Price perPerson={item.perPerson} size="lg" className="mt-2 block" />
              <p className="text-[11px] text-muted-foreground">
                실제 비중 {actualRatio.toFixed(1)}%
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, actualRatio)}%`,
                    background: CHART_COLORS[i],
                  }}
                />
              </div>
              <p
                className={cn(
                  "mt-2 text-[11px] font-semibold",
                  diff >= 0 ? "text-emerald-600" : "text-rose-600",
                )}
              >
                {diff >= 0
                  ? `권장 대비 ${diff.toFixed(1)}% 절감`
                  : `권장 대비 ${Math.abs(diff).toFixed(1)}% 초과`}
              </p>
            </Card>
          );
        })}
      </div>

      {/* 차트 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* 파이차트 */}
        <Card className="p-5">
          <h3 className="text-sm font-bold">항목별 지출 비율</h3>
          <p className="mb-2 text-xs text-muted-foreground">1인 기준 예상 경비 구성</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={88}
                  paddingAngle={3}
                  strokeWidth={2}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={<ChartTip suffix="원" />}
                  formatter={(v: number) => formatKrw(v)}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  formatter={(v) => <span className="text-xs">{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: CHART_COLORS[i] }}
                />
                <span className="text-muted-foreground">{d.name}</span>
                <span className="ml-auto font-bold tabular-nums">{d.ratio}%</span>
              </div>
            ))}
          </div>
        </Card>

        {/* 막대그래프: 실제 vs 권장 */}
        <Card className="p-5">
          <h3 className="text-sm font-bold">실제 비중 vs 권장 비중</h3>
          <p className="mb-2 text-xs text-muted-foreground">
            항공 40% · 숙박 35% · 식비 15% · 교통 10% 기준과 비교
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData[0].data} margin={{ left: -18, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  unit="%"
                />
                <Tooltip content={<ChartTip suffix="%" />} cursor={{ fillOpacity: 0.1 }} />
                <Legend
                  iconType="circle"
                  formatter={(v) => <span className="text-xs">{v}</span>}
                />
                <Bar
                  dataKey="실제비율"
                  name="실제 비중"
                  fill="hsl(var(--chart-1))"
                  radius={[6, 6, 0, 0]}
                  barSize={26}
                />
                <Bar
                  dataKey="권장비율"
                  name="권장 비중"
                  fill="hsl(var(--chart-2))"
                  radius={[6, 6, 0, 0]}
                  barSize={26}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* 항목별 금액 막대 */}
      <Card className="p-5">
        <h3 className="mb-3 text-sm font-bold">항목별 금액 (1인 기준)</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={items.map((i) => ({ label: i.label, 금액원: i.perPerson }))}
              margin={{ left: 8, right: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${Math.round(v / 10000)}만`}
              />
              <Tooltip content={<ChartTip suffix="원" />} cursor={{ fillOpacity: 0.1 }} />
              <Bar dataKey="금액원" name="1인 금액" radius={[8, 8, 0, 0]} barSize={44}>
                {items.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 절약 팁 */}
      <Card className="p-5">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-bold">
          <Sparkles className="h-4 w-4 text-primary" />
          TripCost가 찾은 절약 팁 3가지
        </h3>
        <p className="mb-4 text-xs text-muted-foreground">
          현재 선택한 항공과 숙소를 기준으로 계산했습니다.
        </p>

        <div className="grid gap-3 md:grid-cols-3">
          {plan.tips.map((tip) => (
            <div
              key={tip.id}
              className="rounded-lg border bg-gradient-to-b from-brand-soft/60 to-transparent p-4 dark:from-brand/10"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-2xl">{tip.emoji}</span>
                <Badge
                  variant={
                    tip.confidence === "high"
                      ? "success"
                      : tip.confidence === "medium"
                        ? "brand"
                        : "muted"
                  }
                >
                  {tip.confidence === "high"
                    ? "높은 확률"
                    : tip.confidence === "medium"
                      ? "가능성 있음"
                      : "참고"}
                </Badge>
              </div>
              <h4 className="mt-2 text-sm font-bold leading-snug">{tip.title}</h4>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {tip.description}
              </p>
              <div className="mt-3 flex items-center justify-between border-t pt-2.5">
                <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                  <TrendingDown className="h-3.5 w-3.5 text-success" /> 절감액
                </span>
                <span className="text-sm font-black tabular-nums text-success">
                  {tip.saveAmount > 0 ? `${formatKrw(tip.saveAmount)}` : "비용 절감"}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/60 p-4">
          <span className="flex items-center gap-2 text-sm font-bold">
            <PiggyBank className="h-4 w-4 text-primary" /> 팁 모두 반영 시 총 절약
          </span>
          <span className="text-xl font-black tabular-nums text-success">
            {formatKrw(plan.tips.reduce((s, t) => s + t.saveAmount, 0))}
          </span>
        </div>
      </Card>

      {/* 종합 점수 */}
      <Card className="p-5">
        <h3 className="text-sm font-bold">종합 가성비 점수</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          점수 = (관광지 만족도 × 0.4 + 맛집 평점 × 0.3) ÷ 1인 총비용 × 100. 높을수록 적은 돈으로
          알찬 일정을 만든 것입니다.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-muted/60 p-4 text-center">
            <p className="text-[11px] font-semibold text-muted-foreground">가성비 점수</p>
            <p className="mt-1 text-3xl font-black tabular-nums text-primary">{avgScore}</p>
          </div>
          <div className="rounded-lg bg-muted/60 p-4 text-center">
            <p className="text-[11px] font-semibold text-muted-foreground">1인 일당 비용</p>
            <p className="mt-1 text-3xl font-black tabular-nums">
              {formatKrw(Math.round(budget.totalPerPerson / plan.days))}
            </p>
          </div>
          <div className="rounded-lg bg-muted/60 p-4 text-center">
            <p className="text-[11px] font-semibold text-muted-foreground">방문 장소</p>
            <p className="mt-1 text-3xl font-black tabular-nums">
              {plan.itinerary.reduce(
                (s, d) => s + d.parts.reduce((a, p) => a + p.items.length, 0),
                0,
              )}
              <span className="ml-1 text-sm font-bold">곳</span>
            </p>
          </div>
        </div>

        <div
          className={cn(
            "mt-4 flex items-start gap-3 rounded-lg p-4",
            budget.isOver ? "bg-amber-50 dark:bg-amber-950/40" : "bg-emerald-50 dark:bg-emerald-950/40",
          )}
        >
          {budget.isOver ? (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          )}
          <div className="text-xs leading-relaxed">
            <p className="font-bold">
              {budget.isOver ? "예산을 조금 넘었습니다" : "예산 안에 들어왔습니다"}
            </p>
            <p className="text-muted-foreground">
              {budget.isOver
                ? `1인당 ${formatKrw(Math.abs(budget.remainingPerPerson))}만큼 초과했습니다. 숙박을 게스트하우스로 바꾸거나 항공편을 경유편으로 바꾸면 예산 안에 들어올 수 있습니다.`
                : `1인당 ${formatKrw(budget.remainingPerPerson)}만큼 여유가 남습니다. 이 금액이면 항공을 1인당 ${formatKrw(Math.round(budget.remainingPerPerson / 2 / 1000) * 1000)}원 더 저렴한 날로 옮기거나, 숙박을 1박 업그레이드할 수 있습니다.`}
            </p>
          </div>
        </div>
      </Card>

      {/* 일자별 누적 지출 */}
      <Card className="p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Wallet className="h-4 w-4 text-primary" /> 일자별 누적 지출 (항공·숙박 제외)
        </h3>
        <div className="space-y-2">
          {(() => {
            let acc = 0;
            return plan.itinerary.map((day) => {
              acc += day.costPerPerson;
              const ratio = acc / (budget.totalPerPerson || 1);
              return (
                <div key={day.day} className="flex items-center gap-3">
                  <span className="w-12 shrink-0 text-xs font-bold text-muted-foreground">
                    Day {day.day}
                  </span>
                  <div className="h-7 flex-1 overflow-hidden rounded-md bg-muted">
                    <div
                      className="flex h-full items-center rounded-md bg-gradient-to-r from-emerald-500 to-teal-400 px-2 text-[11px] font-bold text-white transition-all"
                      style={{ width: `${Math.max(8, ratio * 100)}%` }}
                    >
                      누적 {formatKrw(acc)}
                    </div>
                  </div>
                  <span className="w-20 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                    {formatKrw(day.costPerPerson)}
                  </span>
                </div>
              );
            });
          })()}
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {budget.isOver ? (
            <TrendingUp className="h-3.5 w-3.5 text-rose-500" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />
          )}
          항공 {formatKrw(budget.items[0].perPerson)} + 숙박{" "}
          {formatKrw(budget.items[1].perPerson)} + 식비 및 입장료{" "}
          {formatKrw(budget.items[2].perPerson)} + 교통 {formatKrw(budget.items[3].perPerson)} ={" "}
          {formatKrw(budget.totalPerPerson)}
        </p>
      </Card>
    </div>
  );
}