"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Plane, Sparkles, Wallet } from "lucide-react";
import { EXAMPLE_TRIPS, buildTripPlan } from "@/lib/engine";
import { addDaysIso, formatKrw } from "@/lib/format";
import { CITY_MAP } from "@/lib/data";
import { useTripStore } from "@/store/useTripStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchHeader } from "@/components/search/SearchHeader";

export default function HomeView() {
  const router = useRouter();
  const request = useTripStore((s) => s.request);
  const setDates = useTripStore((s) => s.setDates);
  const setCity = useTripStore((s) => s.setCity);
  const setTravelers = useTripStore((s) => s.setTravelers);
  const setBudget = useTripStore((s) => s.setBudget);

  /** 예시 카드 미리보기 (실제 엔진으로 계산) */
  const previews = useMemo(
    () =>
      EXAMPLE_TRIPS.map((ex) => {
        const req = {
          cityId: ex.cityId,
          departureAirport: request.departureAirport,
          startDate: ex.startDate,
          endDate: addDaysIso(ex.startDate, ex.nights),
          travelers: ex.travelers,
          budgetTotal: ex.budgetTotal,
          rooms: Math.max(1, Math.ceil(ex.travelers / 2)),
        };
        const plan = buildTripPlan(req);
        return { ex, plan, req };
      }),
    [request.departureAirport],
  );

  function applyExample(req: (typeof previews)[number]["req"]) {
    setCity(req.cityId);
    setDates(req.startDate, req.endDate);
    setTravelers(req.travelers);
    setBudget(req.budgetTotal);
    router.push("/plan");
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* 헤더 */}
      <header className="border-b">
        <div className="container flex h-16 items-center">
          <span className="flex items-center gap-2 font-black tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-rose-400 text-sm text-white">
              T
            </span>
            TripCost
          </span>
          <span className="ml-3 hidden text-xs text-muted-foreground sm:block">
            가성비 최강 여행계획
          </span>
          <Button
            className="ml-auto"
            size="sm"
            onClick={() => router.push("/plan")}
          >
            내 계획 보기 <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {/* 히어로 */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage:
              "radial-gradient(60rem 30rem at 20% -10%, hsl(var(--brand) / 0.14), transparent), radial-gradient(40rem 25rem at 90% 10%, hsl(var(--chart-2) / 0.12), transparent)",
          }}
        />
        <div className="container py-12 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="brand" className="mb-4 gap-1.5">
              <Sparkles className="h-3 w-3" /> 예산 하나로 가성비 여행을 자동 설계합니다
            </Badge>
            <h1 className="text-balance text-3xl font-black leading-tight tracking-tight sm:text-5xl">
              최저가 항공부터 맛집 동선까지,
              <br />
              <span className="tc-gradient-text">가장 알찬 일정</span>을 찾아드립니다
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              목적지·기간·인원·예산을 입력하면 출발 3일 전후 최저가 항공, 도심 1km 이내 숙소,
              로컬 맛집 동선, 교통패스까지 조합해 예산 안에서 가장 만족도 높은 여행을 만듭니다.
            </p>
          </div>

          {/* 검색 헤더 */}
          <div className="mx-auto mt-8 max-w-5xl">
            <SearchHeader onSearch={() => router.push("/plan")} />
          </div>
        </div>
      </section>

      {/* 예시 계획 */}
      <section className="container pb-16">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold">이런 여행은 어떠세요?</h2>
            <p className="text-xs text-muted-foreground">
              카드를 누르면 같은 조건으로 계획을 다시 계산해 줍니다.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {previews.map(({ ex, plan, req }) => {
            const city = CITY_MAP[ex.cityId];
            const within = plan.budget.totalTotal <= ex.budgetTotal;
            return (
              <button
                key={ex.id}
                onClick={() => applyExample(req)}
                className="group overflow-hidden rounded-lg border bg-card text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
              >
                {/* 썸네일 */}
                <div
                  className="relative flex h-36 items-end p-4"
                  style={{
                    backgroundImage: `linear-gradient(120deg, ${city.gradient[0]}, ${city.gradient[1]})`,
                  }}
                >
                  <span className="absolute right-3 top-2 text-5xl opacity-90 transition-transform group-hover:scale-110">
                    {city.emoji}
                  </span>
                  <div>
                    <p className="text-xs font-medium text-white/85">{city.countryKo}</p>
                    <p className="text-xl font-black text-white">{city.nameKo}</p>
                  </div>
                </div>

                <div className="p-4">
                  <p className="text-sm font-bold">{ex.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{city.tagline}</p>

                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <Plane className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="text-muted-foreground">항공</span>
                      <span className="ml-auto font-bold tabular-nums">
                        {formatKrw(plan.bestFlight.pricePerPerson)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="truncate text-muted-foreground">{plan.stay.name}</span>
                      <span className="ml-auto shrink-0 font-bold tabular-nums">
                        {plan.stay.rating.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wallet className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="text-muted-foreground">총 예상</span>
                      <span className="ml-auto font-black tabular-nums">
                        {formatKrw(plan.budget.totalTotal)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t pt-3">
                    <Badge variant={within ? "success" : "warning"}>
                      {within
                        ? `예산 내 ${formatKrw(ex.budgetTotal - plan.budget.totalTotal, { compact: true })}`
                        : `예산 초과 ${formatKrw(plan.budget.totalTotal - ex.budgetTotal, { compact: true })}`}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs font-bold text-primary">
                      가성비 {plan.valueScore} <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 기능 소개 */}
      <section className="border-t bg-muted/30 py-14">
        <div className="container">
          <h2 className="text-center text-lg font-bold">TripCost가 계산하는 6가지</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                emoji: "✈️",
                title: "항공 최저가 탐색",
                desc: "출발일 ±3일 7일을 실제로 조회해 가장 싼 날짜를 추천합니다.",
              },
              {
                emoji: "🏨",
                title: "도심 1km 숙소",
                desc: "평점 8.0 이상이면서 중심지에서 가까운 순으로 정렬합니다.",
              },
              {
                emoji: "🗓️",
                title: "오전부터 저녁까지 동선",
                desc: "관광지·카페·점심 맛집·저녁 이자카야를 시간순으로 배치합니다.",
              },
              {
                emoji: "🚇",
                title: "교통패스 비교",
                desc: "공항 이동과 시내 패스를 조합해 하루 평균 교통비를 계산합니다.",
              },
              {
                emoji: "📊",
                title: "예산 대시보드",
                desc: "항공 40 · 숙박 35 · 식비 15 · 교통 10 기준과 비교합니다.",
              },
              {
                emoji: "💡",
                title: "절약 팁 3가지",
                desc: "평일 출발, 숙박 교체, 패스 조합으로 절약 가능한 금액을 찾습니다.",
              },
            ].map((f) => (
              <div key={f.title} className="tc-card p-5">
                <span className="text-2xl">{f.emoji}</span>
                <h3 className="mt-2 text-sm font-bold">{f.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="container py-8 text-center text-xs text-muted-foreground">
        TripCost · 데모 데이터 기반. 실제 서비스에서는 Skyscanner · Amadeus · Google Places ·
        Booking API를 사용합니다.
      </footer>
    </div>
  );
}