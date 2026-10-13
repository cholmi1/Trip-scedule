import {
  CITIES,
  CITY_MAP,
  DEFAULT_AIRPORT,
  getAttractions,
  getCafes,
  getRestaurants,
  getStays,
  getTransport,
} from "./data";
import {
  addDaysIso,
  nightsBetween,
  weekdayKo,
  formatDateShort,
} from "./format";
import type {
  BudgetBreakdown,
  City,
  DayPlan,
  DayPart,
  FlightOffer,
  ItineraryItem,
  Place,
  SavingTip,
  StayOption,
  TransportBundle,
  TripPlan,
  TripRequest,
} from "./types";
import { clamp, hashSeed, haversineKm, mulberry32, sampleBy } from "./utils";

/* ════════════════════════════════════════════════════════════
 *  TripCost 가성비 최적화 엔진
 *  1) 항공: 출발일 ±3일 탐색 → 최저가 날짜 + 항공편 3개 추출
 *  2) 숙박: 중심지 1km 이내 + 평점 8.0 이상 → 평점·가격 균형 정렬
 *  3) 일정: 오전 관광 / 점심 맛집 / 오후 관광+카페 / 저녁 로컬 식당
 *  4) 교통: 공항 이동 + 시내 패스 조합 → 1인 교통비 산출
 *  5) 예산: 항공 40 / 숙박 35 / 식비 15 / 교통 10 기준 배분
 *  6) 종합 점수: (관광 만족도*0.4 + 맛집 평점*0.3) / 1인 총비용 * 100
 * ════════════════════════════════════════════════════════════ */

/* ── 1. 항공 ─────────────────────────────────────────────── */

/** 항공사 마스터 (실제 연동 시 Amadeus operatingCarrier 목록으로 대체) */
const AIRLINES = [
  { name: "저가항공 A", code: "JL", cabin: "lowcost" as const, w: 1.0 },
  { name: "저가항공 B", code: "7C", cabin: "lowcost" as const, w: 1.05 },
  { name: "대한항공", code: "KE", cabin: "standard" as const, w: 1.62 },
  { name: "아시아나항공", code: "OZ", cabin: "standard" as const, w: 1.58 },
  { name: "저가항공 C", code: "TW", cabin: "lowcost" as const, w: 1.12 },
  { name: "저가항공 D", code: "9C", cabin: "lowcost" as const, w: 0.96 },
];

/** 지역권별 기본 비행시간(분) 직항 기준 */
const BASE_FLIGHT_MIN: Record<string, number> = {
  tokyo: 145,
  osaka: 145,
  kyoto: 150,
  paris: 750,
  rome: 780,
  bangkok: 265,
  jeju: 65,
};

/** 항공권 기본 가격(1인 왕복, KRW) — 목 데이터이므로 데모 예산에 맞춰 조정 */
const BASE_PRICE: Record<string, number> = {
  tokyo: 268000,
  osaka: 254000,
  kyoto: 262000,
  paris: 655000,
  rome: 612000,
  bangkok: 208000,
  jeju: 62000,
};

function pickAirline(rnd: () => number) {
  const total = AIRLINES.reduce((s, a) => s + a.w, 0);
  let r = rnd() * total;
  for (const a of AIRLINES) {
    r -= a.w;
    if (r <= 0) return a;
  }
  return AIRLINES[0];
}

/**
 * 특정 출발일의 항공편 오퍼 생성 (결정적 시드)
 * 실제 서비스에서는 Skyscanner / Amadeus 응답을 그대로 매핑한다.
 */
export function generateFlightOffers(
  cityId: string,
  departureDate: string,
  returnDate: string,
  fromCode: string,
  toCode: string,
): FlightOffer[] {
  const offers: FlightOffer[] = [];
  const count = 6;
  for (let i = 0; i < count; i++) {
    const rnd = mulberry32(
      hashSeed(`${cityId}|${departureDate}|${fromCode}|${i}`),
    );
    const air = pickAirline(rnd);
    const month = Number(departureDate.slice(5, 7));
    const city = CITY_MAP[cityId];
    const season = city.highSeasonMonths.includes(month) ? 1.32 : 1;
    // 운임 변동: 베이스 × 항공사 계수 × 시즌 × 요일 × 노이즈
    const dow = new Date(departureDate).getDay();
    const dowFactor = dow === 5 || dow === 6 ? 1.12 : dow === 2 || dow === 3 ? 1.06 : 0.96;
    const noise = 0.86 + rnd() * 0.34;
    const base = BASE_PRICE[cityId] ?? 500000;
    const pricePerPerson = Math.round((base / 100) * 100 * air.w * season * dowFactor * noise);

    const direct = rnd() > (air.cabin === "lowcost" ? 0.62 : 0.18);
    const baseMin = BASE_FLIGHT_MIN[cityId] ?? 300;
    const via = direct ? [] : [["베이징", "하이닉"][Math.floor(rnd() * 2)]];
    const durationMin = Math.round(baseMin * (direct ? 1 : 1.55 + rnd() * 0.3));

    // 출발·도착 시각 (결정적)
    const depHour = 6 + Math.floor(rnd() * 15);
    const arrHour = (depHour + Math.floor(durationMin / 60) + (direct ? 0 : 1)) % 24;
    const retDepHour = 13 + Math.floor(rnd() * 7);

    const bags = air.cabin === "lowcost" ? "수하물 15kg" : "수하물 23kg";
    const rating = Number(
      clamp(6.2 + (air.cabin === "lowcost" ? 0 : 1.2) + rnd() * 2.2, 5.5, 9.8).toFixed(1),
    );

    offers.push({
      id: `${cityId}-${departureDate}-${i}`,
      airline: air.name,
      airlineCode: air.code,
      pricePerPerson,
      priceTotal: pricePerPerson * 2,
      currency: "KRW",
      direct,
      via,
      durationMin,
      durationLabel: durationLabelOf(durationMin),
      departureDate,
      returnDate,
      departTime: pad(depHour) + ":" + pad(Math.floor(rnd() * 6) * 10),
      arriveTime: pad(arrHour) + ":" + pad(Math.floor(rnd() * 6) * 10),
      returnDepartTime: pad(retDepHour) + ":" + pad(Math.floor(rnd() * 6) * 10),
      returnArriveTime: pad((retDepHour + 2) % 24) + ":" + pad(Math.floor(rnd() * 6) * 10),
      roundTripDirect: direct,
      cabin: air.cabin,
      baggage: bags,
      seatsLeft: 1 + Math.floor(rnd() * 9),
      source: rnd() > 0.5 ? "Skyscanner" : "Amadeus",
      taxesIncluded: true,
      rating,
      fromAirport: fromCode,
      toAirport: toCode,
      highlights: buildHighlights(air.cabin, direct, rnd),
    });
  }
  return offers.sort((a, b) => a.pricePerPerson - b.pricePerPerson);
}

function buildHighlights(cabin: "lowcost" | "standard", direct: boolean, rnd: () => number) {
  const out: string[] = [];
  if (cabin === "lowcost") out.push("수하물 15kg 포함");
  else out.push("수하물 23kg 포함");
  out.push(direct ? "직항 · 소요시간 최소" : "경유 · 중간 공항 경유");
  if (rnd() > 0.6) out.push("무료 좌석 지정");
  return out;
}

const pad = (n: number) => n.toString().padStart(2, "0");

function durationLabelOf(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}시간 ${pad(m)}분`;
}

/**
 * 출발일 ±3일(총 7일) 탐색 후 가장 싼 날짜를 선택한다.
 * 반환: { offers, log, bestDate }
 */
export function searchCheapestDeparture(req: TripRequest) {
  const offsets = [-3, -2, -1, 0, 1, 2, 3];
  const log: {
    date: string;
    price: number;
    weekday: string;
    deltaDays: number;
  }[] = [];

  let best: { date: string; offers: FlightOffer[]; price: number } | null = null;
  for (const off of offsets) {
    const dep = addDaysIso(req.startDate, off);
    const ret = addDaysIso(req.endDate, off);
    const offers = generateFlightOffers(
      req.cityId,
      dep,
      ret,
      req.departureAirport.code,
      CITY_MAP[req.cityId].airport.code,
    );
    const price = offers[0].pricePerPerson;
    log.push({
      date: dep,
      price,
      weekday: weekdayKo(dep),
      deltaDays: off,
    });
    if (!best || price < best.price) best = { date: dep, offers, price };
  }
  log.sort((a, b) => a.date.localeCompare(b.date));

  return {
    offers: best!.offers,
    bestDate: best!.date,
    bestReturn: addDaysIso(req.endDate, offsets.find((o) => addDaysIso(req.startDate, o) === best!.date)!),
    log,
  };
}

/* ── 2. 숙박 ─────────────────────────────────────────────── */

/**
 * 숙소 랭킹 규칙
 *  1) 평점 8.0 이상만
 *  2) 도심 1km 이내 우선 (부족하면 1.5km → 3km으로 완화)
 *  3) 평점 내림차순 → 가격 오름차순 정렬
 *  4) 추천 숙소는 평점/가격 비율이 가장 좋은 곳(가성비 1위)
 */
export function rankStays(cityId: string): {
  stays: StayOption[];
  recommended: StayOption;
  radiusKm: number;
} {
  const all = getStays(cityId);
  const highRated = all.filter((s) => s.rating >= 8.0);
  const pool = highRated.length >= 3 ? highRated : all;
  const radii = [1.0, 1.5, 3.0, 99];
  for (const r of radii) {
    const near = pool.filter((s) => s.distanceFromCenterKm <= r);
    if (near.length >= 3) {
      const ranked = [...near].sort(
        (a, b) =>
          b.rating - a.rating ||
          a.pricePerNight - b.pricePerNight ||
          a.distanceFromCenterKm - b.distanceFromCenterKm,
      );
      return { stays: ranked, recommended: bestValue(ranked), radiusKm: r };
    }
  }
  const ranked = [...pool].sort((a, b) => b.rating - a.rating);
  return { stays: ranked, recommended: bestValue(ranked), radiusKm: 99 };
}

/** 가성비 = (평점/10) ÷ (야간가/10만원) — 높을수록 가성비가 좋다 */
export function stayValueScore(s: StayOption) {
  return (s.rating / 10) / (s.pricePerNight / 100000);
}

function bestValue(list: StayOption[]) {
  return list.reduce((a, b) => (stayValueScore(a) >= stayValueScore(b) ? a : b));
}

/* ── 3. 일정 생성 ────────────────────────────────────────── */

const PART_META: { part: DayPart; label: string; time: string }[] = [
  { part: "morning", label: "오전", time: "09:00" },
  { part: "afternoon", label: "오후", time: "13:00" },
  { part: "evening", label: "저녁", time: "18:30" },
];

const PART_ICON: Record<DayPart, string> = {
  morning: "🌅",
  afternoon: "☀️",
  evening: "🌙",
};

/** 이동 수단 결정: 1km 미만은 도보, 그 이상은 교통수단 */
function decideTransport(
  km: number,
  tier: City["transportTier"],
): { transport: ItineraryItem["transport"]; label: string; min: number } {
  if (km < 0.8)
    return { transport: "walk", label: "도보", min: Math.max(6, Math.round((km / 4.5) * 60)) };
  const kmh = tier === "low" ? 16 : tier === "mid" ? 19 : 22;
  const min = Math.round((km / kmh) * 60) + 6;
  if (tier === "low")
    return { transport: "bus", label: "시내 버스", min };
  if (km > 6) return { transport: "train", label: "지하철·전철", min };
  return { transport: "subway", label: "지하철", min };
}

/** 단일 이동 요금 추정 */
function transportCost(t: ItineraryItem["transport"], tier: City["transportTier"]) {
  switch (t) {
    case "walk":
      return 0;
    case "subway":
      return tier === "high" ? 1600 : 1400;
    case "train":
      return tier === "high" ? 2200 : 1700;
    case "bus":
      return tier === "low" ? 1500 : 1800;
    default:
      return 9000;
  }
}

/** 오전/오후/저녁에 배치할 장소 고르기 */
function pickSlots(cityId: string, dayIndex: number, isLastDay: boolean) {
  const attractions = getAttractions(cityId);
  const lunchSpots = getRestaurants(cityId).filter(
    (r) => r.mealSlot === "lunch" || !r.mealSlot,
  );
  const dinnerSpots = getRestaurants(cityId).filter(
    (r) => r.mealSlot === "dinner" || !r.mealSlot,
  );
  const cafes = getCafes(cityId);

  // 날짜별 결정적 시드로 같은 입력 → 같은 결과 재현
  const rnd = mulberry32(hashSeed(`${cityId}|day|${dayIndex}`));

  // 오전/오후 관광지: 평점 가성비 순으로 상위 후보에서 3곳 추첨
  const att = sampleBy(
    [...attractions].sort((a, b) => valueOf(a) - valueOf(b)).slice(0, 9),
    3,
    rnd,
  );
  // 점심은 현지 맛집
  const lunch = sampleBy([...lunchSpots].sort((a, b) => b.rating - a.rating).slice(0, 6), 1, rnd)[0];
  // 저녁은 가성비 이자카야/로컬 식당
  const dinnerPool = [...dinnerSpots].sort(
    (a, b) => b.rating / (b.mealCost || 1) - a.rating / (a.mealCost || 1),
  );
  const dinner = sampleBy(dinnerPool.slice(0, 6), 1, rnd)[0];
  // 카페는 오후에 배치
  const cafe = sampleBy(cafes, 1, rnd)[0];

  return { att, lunch, dinner, cafe, isLastDay };
}

/** 관광지 1곳의 1인 만족 기여값 */
function valueOf(p: Place) {
  return p.rating * 10 + p.ticketPrice / 1000; // 평점 높고 입장료 저렴할수록 좋은 값
}

/** 하루 일정 생성 */
export function buildItinerary(
  req: TripRequest,
  city: City,
  stay: StayOption,
): DayPlan[] {
  const nights = nightsBetween(req.startDate, req.endDate);
  const days = nights + 1;
  const plans: DayPlan[] = [];

  for (let d = 0; d < days; d++) {
    const date = addDaysIso(req.startDate, d);
    const isLastDay = d === days - 1;
    const { att, lunch, dinner, cafe } = pickSlots(city.id, d, isLastDay);

    // 마지막 날은 공항으로 이동해야 하므로 관광 2곳만 배정
    const dayAtt = isLastDay ? att.slice(0, 2) : att;

    const morning: Place[] = isLastDay ? [] : [dayAtt[0]];
    // 오후: 관광지 + 로컬 맛집(점심) + 카페
    const afternoon: Place[] = isLastDay
      ? [lunch].filter(Boolean)
      : [dayAtt[1], lunch, cafe].filter(Boolean);
    // 저녁: 가성비 이자카야 / 로컬 식당
    const evening: Place[] = [dinner].filter(Boolean);

    const partPlaces: { part: DayPart; items: Place[] }[] = [
      { part: "morning", items: morning },
      { part: "afternoon", items: afternoon },
      { part: "evening", items: evening },
    ];

    let cursor = PART_META[0].time;
    let prevPoint = { lat: stay.lat, lng: stay.lng };
    let dayCost = 0;
    let dayDistance = 0;

    const parts = partPlaces.map(({ part, items }) => {
      const meta = PART_META.find((p) => p.part === part)!;
      let t = cursor;
      const built: ItineraryItem[] = [];
      for (const place of items) {
        const km = haversineKm(prevPoint, { lat: place.lat, lng: place.lng });
        const tInfo = decideTransport(km, city.transportTier);
        const endMin = toMinute(t) + place.durationMin;
        const end = toClock(endMin);
        const cost = place.mealCost + place.ticketPrice + transportCost(tInfo.transport, city.transportTier);
        built.push({
          place,
          transport: tInfo.transport,
          transportLabel: tInfo.label,
          travelMin: tInfo.min,
          distanceKm: Number(km.toFixed(2)),
          cost,
          startTime: t,
          endTime: end,
        });
        dayCost += cost;
        dayDistance += km;
        prevPoint = { lat: place.lat, lng: place.lng };
        t = toClock(endMin + tInfo.min + 25); // 이동 + 휴식
      }
      cursor = t;
      return {
        part,
        label: meta.label,
        timeRange: built.length
          ? `${built[0].startTime} - ${built[built.length - 1].endTime}`
          : "휴식",
        items: built,
      };
    });

    plans.push({
      day: d + 1,
      date,
      dateLabel: `${formatDateShort(date)} (${weekdayKo(date)})`,
      costPerPerson: dayCost,
      parts,
      totalDistanceKm: Number(dayDistance.toFixed(1)),
      theme: isLastDay ? "귀국 · 마지막 쇼핑" : `Day ${d + 1} · ${city.districts[d % city.districts.length]}`,
    });
  }

  // part 라벨/아이콘 정리
  plans.forEach((p) => {
    p.parts.forEach((part) => {
      const meta = PART_META.find((m) => m.part === part.part)!;
      part.label = `${PART_ICON[part.part]} ${meta.label}`;
      part.timeRange = part.items.length
        ? `${part.items[0].startTime} - ${part.items[part.items.length - 1].endTime}`
        : "자유 일정";
    });
  });

  return plans;
}

/** "09:30" → 570 (분) */
function toMinute(clock: string) {
  const [h, m] = clock.split(":").map(Number);
  return h * 60 + m;
}

/** 분 → "09:30" (24시간을 넘으면 마지막 시각으로 고정) */
function toClock(totalMin: number) {
  const t = Math.max(0, Math.min(totalMin, 24 * 60 - 1));
  return pad(Math.floor(t / 60)) + ":" + pad(t % 60);
}

/* ── 4. 교통 ─────────────────────────────────────────────── */

export function buildTransportBundle(req: TripRequest, city: City): TransportBundle {
  const { airportTransfers, cityPasses } = getTransport(city.id);
  const nights = nightsBetween(req.startDate, req.endDate);
  const days = nights + 1;

  // 공항 이동: 최저가 중 왕복/편도 구조상 가장 저렴한 것을 기본 선택
  const sortedTransfers = [...airportTransfers].sort((a, b) => a.price - b.price);
  const transfer = sortedTransfers[0];

  // 시내 패스: 기간에 맞는 것을 고른다 (3일 이상이면 3일 이상권 우선)
  const sortedPasses = [...cityPasses].sort((a, b) => a.price - b.price);
  const multiDay = sortedPasses.find(
    (p) => p.durationLabel.includes("72") || p.durationLabel.includes("96") || p.durationLabel.includes("3일") || p.durationLabel.includes("4일"),
  );
  const pass = multiDay ?? sortedPasses[0];

  const totalPerPerson =
    transfer.perDayEquivalent * 2 + // 왕복 2회
    (pass.billing === "per_day" ? pass.perDayEquivalent * days : pass.price);

  const dailyBreakdown = Array.from({ length: days }, (_, i) => ({
    day: i + 1,
    cost: pass.billing === "per_day" ? pass.perDayEquivalent : pass.price / days,
    label: i === 0 ? `${transfer.name} 편도` : i === days - 1 ? `${transfer.name} 복귀` : `${pass.name} ÷ ${days}일`,
  }));

  return {
    airportTransfers,
    cityPasses,
    totalPerPerson: Math.round(totalPerPerson),
    totalTotal: Math.round(totalPerPerson) * req.travelers,
    chosenIds: [transfer.id, pass.id],
    dailyBreakdown: dailyBreakdown.map((d) => ({
      ...d,
      cost: Math.round(d.cost),
    })),
  };
}

/* ── 5. 예산 ─────────────────────────────────────────────── */

const CATEGORY_META: {
  key: BudgetBreakdown["items"][number]["category"];
  label: string;
  targetRatio: number;
  color: string;
}[] = [
  { key: "flight", label: "항공", targetRatio: 40, color: "hsl(var(--chart-1))" },
  { key: "stay", label: "숙박", targetRatio: 35, color: "hsl(var(--chart-2))" },
  { key: "food", label: "식비", targetRatio: 15, color: "hsl(var(--chart-3))" },
  { key: "transport", label: "교통", targetRatio: 10, color: "hsl(var(--chart-4))" },
];

export function buildBudget(
  req: TripRequest,
  flightPerPerson: number,
  stayPerPerson: number,
  itinerary: DayPlan[],
  transport: TransportBundle,
): BudgetBreakdown {
  const foodPerPerson = itinerary.reduce((s, d) => s + d.costPerPerson, 0);
  const attractionPerPerson = itinerary.reduce(
    (s, d) =>
      s + d.parts.reduce((a, p) => a + p.items.reduce((b, i) => b + i.place.ticketPrice, 0), 0),
    0,
  );
  const foodTotal = foodPerPerson + attractionPerPerson;

  const amounts: Record<string, number> = {
    flight: flightPerPerson,
    stay: stayPerPerson,
    food: foodTotal,
    transport: transport.totalPerPerson,
  };

  const items = CATEGORY_META.map((c) => ({
    category: c.key,
    label: c.label,
    perPerson: Math.round(amounts[c.key]),
    total: Math.round(amounts[c.key]) * req.travelers,
    targetRatio: c.targetRatio,
    color: c.color,
  }));

  const totalPerPerson = items.reduce((s, i) => s + i.perPerson, 0);
  const budgetPerPerson = Math.round(req.budgetTotal / req.travelers);

  return {
    items,
    totalPerPerson,
    totalTotal: totalPerPerson * req.travelers,
    budget: budgetPerPerson,
    budgetTotal: req.budgetTotal,
    isOver: totalPerPerson > budgetPerPerson,
    usageRatio: Number(((totalPerPerson / budgetPerPerson) * 100).toFixed(1)),
    remainingPerPerson: budgetPerPerson - totalPerPerson,
  };
}

/* ── 6. 절약 팁 생성 ─────────────────────────────────────── */

export function buildTips(
  req: TripRequest,
  city: City,
  plan: Partial<TripPlan>,
): SavingTip[] {
  const tips: SavingTip[] = [];
  const travelers = req.travelers;
  const nights = nightsBetween(req.startDate, req.endDate);

  // 팁 1) 비행기: 출발일 ±3일 중 더 싼 날로 이동
  if (plan.flightSearchLog && plan.flightSearchLog.length) {
    const base = plan.flightSearchLog.find((l) => l.deltaDays === 0);
    const best = plan.flightSearchLog.reduce((a, b) => (b.price < a.price ? b : a));
    if (base && best && base.price > best.price) {
      const save = Math.round(((base.price - best.price) * travelers) / 1000) * 1000;
      tips.push({
        id: "tip-flight-date",
        title: `${best.date.slice(5).replace("-", "월 ")}일 출발로 변경`,
        description: `같은 기간인데 출발일을 ${best.date.slice(5).replace("-", "월 ")}일로 옮기면 항공권이 가장 저렴해집니다.`,
        saveAmount: save,
        category: "flight",
        confidence: "high",
        emoji: "✈️",
      });
    }
  }

  // 팁 2) 숙박: 더 비싼 숙소 대신 가성비 1위로 바꾸기
  if (plan.stays && plan.stays.length >= 2) {
    const best = plan.stay ?? plan.stays[0];
    const priciest = [...plan.stays].sort((a, b) => b.pricePerNight - a.pricePerNight)[0];
    if (priciest.id !== best.id) {
      const occupants = 2; // 2인 1실 기준
      const save =
        Math.round(
          ((priciest.pricePerNight - best.pricePerNight) * nights * Math.ceil(travelers / occupants)) /
            1000,
        ) * 1000;
      if (save > 0)
        tips.push({
          id: "tip-stay-cheap",
          title: `${priciest.name} 대신 ${best.name} 선택`,
          description: `평점 ${best.rating.toFixed(1)}점으로 도심에서 ${best.distanceFromCenterKm}km. 야간 ${Math.round(best.pricePerNight).toLocaleString()}원이라 평점은 높고 가격은 ${Math.round(priciest.pricePerNight - best.pricePerNight).toLocaleString()}원 저렴합니다.`,
          saveAmount: save,
          category: "stay",
          confidence: "high",
          emoji: "🏨",
        });
    }
  }

  // 팁 3) 항공편: 직항 vs 저가항 동선
  if (plan.bestFlight) {
    const direct = plan.bestFlight.direct;
    tips.push({
      id: "tip-flight-type",
      title: direct ? "직항 이용으로 추가 이동 줄이기" : "경유편 선택이 실제로 유리",
      description: direct
        ? `직항이라 ${city.airport.nameKo}에서 시내까지 이동 횟수가 적어 교통비가 절약됩니다.`
        : `경유편이 직항보다 ${(plan.bestFlight.durationMin - 240).toString().slice(0, 3)}분 길어 소요 시간이 늘어나니 예산에 여유를 두세요.`,
      saveAmount: direct ? 8000 * travelers : 0,
      category: "flight",
      confidence: "medium",
      emoji: "🛫",
    });
  }

  // 팁 4) 교통: 패스 조합
  if (plan.transport && plan.transport.chosenIds.length === 2) {
    tips.push({
      id: "tip-transport-pass",
      title: `${city.nameKo} 시내 패스는 하루 기준 ${Math.round(plan.transport.totalPerPerson / Math.max(1, nights + 1)).toLocaleString()}원`,
      description: `개별권으로 매번 사면 약 ${Math.round(plan.transport.totalPerPerson * 1.6).toLocaleString()}원입니다. 하루 패스 한 장으로 전 노선을 탈 수 있습니다.`,
      saveAmount: Math.round(plan.transport.totalPerPerson * 0.6 * travelers),
      category: "transport",
      confidence: "medium",
      emoji: "🚇",
    });
  }

  // 팁 5) 식비: 자판기·시장 이용
  const market = city.avgFoodCost * 0.35 * travelers * Math.max(1, nights);
  tips.push({
    id: "tip-food-market",
    title: "식사 1회를 시장이나 분식으로 대체",
    description: `${city.nameKo} 시내 시장이나 편의점에서 사 먹으면 하루 식비가 크게 줄어듭니다.`,
    saveAmount: Math.round(market / 100) * 100,
    category: "food",
    confidence: "medium",
    emoji: "🥟",
  });

  // 팁 6) 비행기: 저가 항공사 좌석 지정
  tips.push({
    id: "tip-seat",
    title: "좌석 지정과 기내식 결제를 미리 끊기",
    description: "저가 항공은 유료 부가서비스가 탑승권에 포함되지 않습니다. 사전 결제하면 공항에서 추가로 내는 비용이 사라집니다.",
    saveAmount: 25000 * travelers,
    category: "flight",
    confidence: "low",
    emoji: "🎫",
  });

  return tips.sort((a, b) => b.saveAmount - a.saveAmount).slice(0, 3);
}

/* ── 종합 점수 계산 ──────────────────────────────────────── */

/**
 * 가성비 점수
 * score = (관광지 만족도 * 0.4 + 맛집 평점 * 0.3) / 1인 총비용 * 100
 *  - 만족도·평점은 10점 척도로 정규화
 *  - 총비용은 1인 기준 10만원 단위로 스케일링(점수 비교 안정화)
 */
export function computeValueScore(
  itinerary: DayPlan[],
  budget: BudgetBreakdown,
): number {
  const att = itinerary.flatMap((d) =>
    d.parts.flatMap((p) => p.items.map((i) => i.place)),
  );
  const attractions = att.filter((p) => p.category === "attraction");
  const foods = att.filter((p) => p.category === "restaurant" || p.category === "cafe");

  const avgAttraction = attractions.length
    ? attractions.reduce((s, p) => s + p.rating, 0) / attractions.length
    : 0;
  const avgFood = foods.length ? foods.reduce((s, p) => s + p.rating, 0) / foods.length : 0;

  const raw = (avgAttraction * 0.4 + avgFood * 0.3) / (budget.totalPerPerson / 100000) * 100;
  return Number(raw.toFixed(1));
}

/* ── 오케스트레이션 ──────────────────────────────────────── */

/** 요청 → 전체 여행 계획 생성 (메인 엔트리) */
export function buildTripPlan(req: TripRequest): TripPlan {
  const city = CITY_MAP[req.cityId] ?? CITIES[0];
  const nights = nightsBetween(req.startDate, req.endDate);
  const days = nights + 1;

  // 1) 항공
  const flightResult = searchCheapestDeparture(req);
  const flights = flightResult.offers.slice(0, 3);
  const bestFlight = flights[0];

  // 2) 숙박 (추천은 가성비 1위)
  const { stays, recommended } = rankStays(city.id);
  const stay = recommended;
  // pricePerNight 는 2인 1박 기준이므로 실제 인원수로 나눠 1인당 비용을 구한다
  const occupants = Math.max(1, Math.ceil(req.travelers / Math.max(1, req.rooms)));
  const stayPerPerson = Math.round((stay.pricePerNight * nights) / occupants);

  // 3) 일정
  const itinerary = buildItinerary(req, city, stay);

  // 4) 교통
  const transport = buildTransportBundle(req, city);

  // 5) 예산
  const budget = buildBudget(req, bestFlight.pricePerPerson, stayPerPerson, itinerary, transport);

  // 6) 팁 + 점수
  const partialPlan: Partial<TripPlan> = {
    flightSearchLog: flightResult.log,
    bestFlight,
    stay,
    stays,
    transport,
  };
  const tips = buildTips(req, city, partialPlan);
  const valueScore = computeValueScore(itinerary, budget);

  return {
    request: req,
    city,
    nights,
    days,
    bestFlight,
    flights,
    flightSearchLog: flightResult.log,
    stay,
    stays,
    itinerary,
    transport,
    budget,
    tips,
    valueScore,
    generatedAt: new Date().toISOString(),
  };
}

/** 예시 카드용 프리셋 여행 */
export interface ExampleTrip {
  id: string;
  label: string;
  cityId: string;
  startDate: string;
  nights: number;
  travelers: number;
  budgetTotal: number;
}

export const EXAMPLE_TRIPS: ExampleTrip[] = [
  {
    id: "ex-tokyo",
    label: "도쿄 3박 4일 2인 120만원",
    cityId: "tokyo",
    startDate: addDaysIso(new Date().toISOString().slice(0, 10), 30),
    nights: 3,
    travelers: 2,
    budgetTotal: 1200000,
  },
  {
    id: "ex-osaka",
    label: "오사카 2박 3일 2인 95만원",
    cityId: "osaka",
    startDate: addDaysIso(new Date().toISOString().slice(0, 10), 45),
    nights: 2,
    travelers: 2,
    budgetTotal: 950000,
  },
  {
    id: "ex-jeju",
    label: "제주도 2박 3일 2인 55만원",
    cityId: "jeju",
    startDate: addDaysIso(new Date().toISOString().slice(0, 10), 21),
    nights: 2,
    travelers: 2,
    budgetTotal: 550000,
  },
];

export { DEFAULT_AIRPORT, CITY_MAP };