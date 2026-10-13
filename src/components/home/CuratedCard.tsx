"use client";

import { ArrowRight, MapPin, Sparkles } from "lucide-react";
import { addDaysIso, formatKrw } from "@/lib/format";
import { buildTripPlan } from "@/lib/engine";
import { useTripStore } from "@/store/useTripStore";
import { useRouter } from "next/navigation";
import type { City } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface Props {
  city: City;
  /** 3박4일 2인 예상 총액 */
  totals?: number;
}

/** 큐레이션 도시 카드 — 클릭하면 바로 계획 계산 */
export function CuratedCard({ city, totals }: Props) {
  const router = useRouter();
  const departureAirport = useTripStore((s) => s.request.departureAirport);
  const setCity = useTripStore((s) => s.setCity);
  const setDates = useTripStore((s) => s.setDates);

  const total =
    totals ??
    buildTripPlan({
      cityId: city.id,
      departureAirport,
      startDate: addDaysIso(new Date().toISOString().slice(0, 10), 30),
      endDate: addDaysIso(new Date().toISOString().slice(0, 10), 33),
      travelers: 2,
      budgetTotal: 1500000,
      rooms: 1,
    }).budget.totalTotal;

  function open() {
    const start = addDaysIso(new Date().toISOString().slice(0, 10), 30);
    setCity(city.id);
    setDates(start, addDaysIso(start, 3));
    router.push("/plan");
  }

  return (
    <button
      onClick={open}
      className="group overflow-hidden rounded-lg border bg-card text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div
        className="relative flex h-24 items-end p-3"
        style={{
          backgroundImage: `linear-gradient(120deg, ${city.gradient[0]}, ${city.gradient[1]})`,
        }}
      >
        <span className="absolute right-2.5 top-2 text-4xl opacity-90 transition-transform group-hover:scale-110">
          {city.emoji}
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-black text-white">{city.nameKo}</p>
          <p className="flex items-center gap-1 truncate text-[10px] text-white/85">
            <MapPin className="h-2.5 w-2.5" />
            {city.countryKo}
          </p>
        </div>
      </div>
      <div className="p-2.5">
        <p className="truncate text-[11px] text-muted-foreground">{city.tagline}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] font-bold tabular-nums text-primary">
            왕복 약 {Math.round((city.fare ?? 0) / 10000)}만원
          </span>
          <Badge variant="brand" className="px-1.5 py-0 text-[10px]">
            실제 장소
          </Badge>
        </div>
        <p className="mt-1.5 flex items-center gap-1 border-t pt-1.5 text-[11px] font-semibold text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          3박4일 2인 약 {formatKrw(total, { compact: true })}
          <ArrowRight className="ml-auto h-3 w-3 text-primary" />
        </p>
      </div>
    </button>
  );
}