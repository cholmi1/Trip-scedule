import citiesRaw from "@/data/cities.json";
import catalogRaw from "@/data/catalog.json";
import { CURATED_IDS, RAW_PLACES, RAW_STAYS, RAW_TRANSPORT } from "@/data/entries";

import type { City, Place, StayOption, TransportPass } from "./types";
import { haversineKm, hashSeed, mulberry32 } from "./utils";

/* ────────────────────────────────────────────────────────────
 * Mock 데이터 로더
 * - 원본은 JSON, 여기서 타입 + 파생 필드를 채운다.
 * - 실제 연동 시 이 파일만 API 호출로 교체하면 된다.
 * ──────────────────────────────────────────────────────────── */

/* ── 1. 큐레이션 도시 (실제 장소 데이터 보유) ────────────── */

/** 1인 왕복 최저가 기준(KRW) — 목 운임 */
const CURATED_FARE: Record<string, number> = {
  tokyo: 268000,
  osaka: 254000,
  kyoto: 262000,
  paris: 655000,
  rome: 612000,
  bangkok: 208000,
  jeju: 62000,
};

const CITIES_CURATED: City[] = (citiesRaw as City[]).map((c) => ({
  ...c,
  fare: CURATED_FARE[c.id] ?? 300000,
  curated: true,
}));

/* ── 2. 카탈로그 도시 (좌표·공항·운임 기준만 보유) ──────── */

interface CatalogCity {
  id: string;
  ko: string;
  en: string;
  cc: string;
  ce: string;
  emoji: string;
  lat: number;
  lng: number;
  ap: string;
  apko: string;
  ds: string[];
  dsr: string;
  fare: number;
  tier: "low" | "mid" | "high";
  hs: number[];
  tags: string[];
}

/** 카드 그라디언트 팔레트 (도시 인덱스 기반 순환) */
const PALETTE: [string, string][] = [
  ["#FF385C", "#FF7A9C"],
  ["#F97316", "#FDBA74"],
  ["#0EA5E9", "#7DD3FC"],
  ["#10B981", "#6EE7B7"],
  ["#8B5CF6", "#C4B5FD"],
  ["#F59E0B", "#FCD34D"],
  ["#14B8A6", "#99F6E4"],
  ["#EC4899", "#F9A8D4"],
  ["#3B82F6", "#93C5FD"],
  ["#84CC16", "#D9F99D"],
  ["#6366F1", "#A5B4FC"],
  ["#EF4444", "#FCA5A5"],
];

/** 비용 티어별 1일 평균 식사비 / 입장료 기준값(KRW) */
const TIER_PROFILE: Record<
  CatalogCity["tier"],
  { food: number; ticket: number; transport: City["transportTier"] }
> = {
  low: { food: 34000, ticket: 5000, transport: "low" },
  mid: { food: 54000, ticket: 9000, transport: "mid" },
  high: { food: 82000, ticket: 18000, transport: "high" },
};

/** 국가별 통화·언어 */
const COUNTRY_INFO: Record<string, { currency: string; lang: string }> = {
  Japan: { currency: "JPY", lang: "ja" },
  "South Korea": { currency: "KRW", lang: "ko" },
  Taiwan: { currency: "TWD", lang: "zh" },
  China: { currency: "CNY", lang: "zh" },
  "Hong Kong": { currency: "HKD", lang: "zh" },
  Macau: { currency: "MOP", lang: "zh" },
  Singapore: { currency: "SGD", lang: "en" },
  Malaysia: { currency: "MYR", lang: "ms" },
  Thailand: { currency: "THB", lang: "th" },
  Indonesia: { currency: "IDR", lang: "id" },
  Vietnam: { currency: "VND", lang: "vi" },
  Philippines: { currency: "PHP", lang: "en" },
  Cambodia: { currency: "KHR", lang: "km" },
  Laos: { currency: "LAK", lang: "lo" },
  Myanmar: { currency: "MMK", lang: "my" },
  India: { currency: "INR", lang: "en" },
  Nepal: { currency: "NPR", lang: "ne" },
  Mongolia: { currency: "MNT", lang: "mn" },
  Turkey: { currency: "TRY", lang: "tr" },
  UAE: { currency: "AED", lang: "ar" },
  Qatar: { currency: "QAR", lang: "ar" },
  Saudi: { currency: "SAR", lang: "ar" },
  Egypt: { currency: "EGP", lang: "ar" },
  Morocco: { currency: "MAD", lang: "ar" },
  Spain: { currency: "EUR", lang: "es" },
  Portugal: { currency: "EUR", lang: "pt" },
  Netherlands: { currency: "EUR", lang: "nl" },
  Belgium: { currency: "EUR", lang: "nl" },
  Germany: { currency: "EUR", lang: "de" },
  Switzerland: { currency: "CHF", lang: "de" },
  Austria: { currency: "EUR", lang: "de" },
  Italy: { currency: "EUR", lang: "it" },
  Greece: { currency: "EUR", lang: "el" },
  Croatia: { currency: "EUR", lang: "hr" },
  Hungary: { currency: "HUF", lang: "hu" },
  Czechia: { currency: "CZK", lang: "cs" },
  Poland: { currency: "PLN", lang: "pl" },
  Denmark: { currency: "DKK", lang: "da" },
  Sweden: { currency: "SEK", lang: "sv" },
  Norway: { currency: "NOK", lang: "no" },
  Finland: { currency: "EUR", lang: "fi" },
  Iceland: { currency: "ISK", lang: "is" },
  Ireland: { currency: "EUR", lang: "en" },
  "United Kingdom": { currency: "GBP", lang: "en" },
  "United States": { currency: "USD", lang: "en" },
  Canada: { currency: "CAD", lang: "en" },
  Mexico: { currency: "MXN", lang: "es" },
  Cuba: { currency: "CUP", lang: "es" },
  Brazil: { currency: "BRL", lang: "pt" },
  Argentina: { currency: "ARS", lang: "es" },
  Chile: { currency: "CLP", lang: "es" },
  Peru: { currency: "PEN", lang: "es" },
  Colombia: { currency: "COP", lang: "es" },
  Australia: { currency: "AUD", lang: "en" },
  "New Zealand": { currency: "NZD", lang: "en" },
};

/** 카탈로그 → City 정규화 */
function normalizeCatalogCity(raw: CatalogCity, index: number): City {
  const profile = TIER_PROFILE[raw.tier];
  const info = COUNTRY_INFO[raw.ce] ?? { currency: "USD", lang: "en" };
  const districts = raw.ds.length ? raw.ds : [raw.ko];
  return {
    id: raw.id,
    nameKo: raw.ko,
    nameEn: raw.en,
    countryKo: raw.cc,
    countryEn: raw.ce,
    emoji: raw.emoji,
    gcpPlaceId: `mock_${raw.id}`,
    center: { lat: raw.lat, lng: raw.lng },
    downtown: { lat: raw.lat, lng: raw.lng, name: districts[0] },
    airport: { code: raw.ap, nameKo: raw.apko, nameEn: raw.apko },
    districts,
    avgFoodCost: profile.food,
    avgTicketCost: profile.ticket,
    transportTier: profile.transport,
    currency: info.currency,
    lang: info.lang,
    tagline: raw.dsr,
    keywords: [raw.ko, raw.en, raw.cc, ...raw.tags, ...districts],
    gradient: PALETTE[index % PALETTE.length],
    highSeasonMonths: raw.hs,
    fare: raw.fare,
    curated: false,
  };
}

/**
 * 큐레이션 도시 목록 (장소 데이터가 실제로 있는 도시)
 * places/ 폴더에 파일이 있는 도시를 자동으로 판별한다.
 */
const CURATED_SET = new Set<string>(CURATED_IDS);

/** 도시 목록 (큐레이션 7 + 카탈로그 115, 큐레이션 여부 자동 판별) */
export const CITIES: City[] = (() => {
  const seen = new Set(CITIES_CURATED.map((c) => c.id));
  const extra = (catalogRaw as { cities: CatalogCity[] }).cities
    .filter((c) => !seen.has(c.id))
    .map(normalizeCatalogCity);
  return [...CITIES_CURATED, ...extra].map((c) => ({
    ...c,
    // cities.json 의 7개는 항상 큐레이션이고, 카탈로그는 places 파일이 있는 도시만 해당
    curated: CURATED_SET.has(c.id),
  }));
})();

export const CITY_MAP: Record<string, City> = Object.fromEntries(
  CITIES.map((c) => [c.id, c]),
);

/** 큐레이션 도시만 추려낸 목록 */
export const CURATED_CITIES = CITIES.filter((c) => c.curated);

/** 지역별 큐레이션 도시 (홈 화면 큐레이션 섹션에서 사용) */
export const CURATED_GROUPS: { region: string; ids: string[] }[] = [
  { region: "원래 큐레이션", ids: ["tokyo", "osaka", "kyoto", "paris", "rome", "bangkok", "jeju"] },
  { region: "일본", ids: ["fukuoka", "nagoya", "sapporo"] },
  { region: "중국", ids: ["shanghai", "beijing", "chengdu"] },
  { region: "동남아", ids: ["chiangmai", "bali", "hanoi"] },
];

/* ── 3. 공통 상수 ────────────────────────────────────────── */

/** 출발 공항 기본값 (인천) */
export const DEFAULT_AIRPORT = { code: "ICN", name: "인천국제공항" };

/** 출발 공항 후보 */
export const DEPARTURE_AIRPORTS = [
  { code: "ICN", name: "인천국제공항", city: "서울", lat: 37.4602, lng: 126.4407, factor: 1.0 },
  { code: "GMP", name: "김포공항", city: "서울", lat: 37.5586, lng: 126.7906, factor: 1.0 },
  { code: "PUS", name: "부산공항", city: "부산", lat: 35.1795, lng: 128.9382, factor: 1.15 },
  { code: "CJU", name: "제주국제공항", city: "제주", lat: 33.5113, lng: 126.4926, factor: 0.92 },
  { code: "TAO", name: "칭다오공항", city: "인천", lat: 36.3614, lng: 120.3744, factor: 0.98 },
];

/* ── 4. 장소 데이터 ──────────────────────────────────────── */

/** 장소 카테고리 표시 라벨 */
const CATEGORY_LABEL: Record<Place["category"], string> = {
  attraction: "관광지",
  restaurant: "맛집",
  cafe: "카페",
  shopping: "쇼핑",
};

/** JSON 라운드 장소 데이터 (선택 필드는 런타임에 채워진다) */
interface RawPlace {
  id: string;
  name: string;
  nameEn: string;
  lat: number;
  lng: number;
  address: string;
  rating: number;
  reviewCount: number;
  durationMin: number;
  ticketPrice?: number;
  mealCost?: number;
  priceLevel?: number;
  emoji?: string;
  gradient?: string[];
  diningStyle?: string;
  mealSlot?: string;
  description: string;
  tip?: string;
  bestTime?: string;
}

/** 도시별 장소 묶음 */
interface RawPlaceSet {
  attractions: RawPlace[];
  restaurants: RawPlace[];
  cafes: RawPlace[];
}

/** JSON 라운드 숙소 데이터 */
interface RawStay {
  id: string;
  name: string;
  nameEn?: string;
  type: StayOption["type"];
  typeLabel?: string;
  district: string;
  lat: number;
  lng: number;
  pricePerNight: number;
  rating: number;
  reviewCount: number;
  amenities: string[];
  emoji: string;
  gradient: string[];
  description: string;
  freeCancellation: boolean;
  breakfastIncluded: boolean;
}

/** JSON 라운드 데이터 → Place 타입으로 변환 */
function toPlaces(cityId: string, data: RawPlaceSet): Place[] {
  const gcp = CITY_MAP[cityId].gcpPlaceId;
  const convert = (raw: RawPlace, category: Place["category"]): Place => ({
    id: raw.id,
    name: raw.name,
    nameEn: raw.nameEn,
    category,
    categoryLabel: CATEGORY_LABEL[category],
    lat: raw.lat,
    lng: raw.lng,
    address: raw.address,
    rating: raw.rating,
    reviewCount: raw.reviewCount,
    durationMin: raw.durationMin,
    ticketPrice: raw.ticketPrice ?? 0,
    mealCost: raw.mealCost ?? 0,
    priceLevel: (raw.priceLevel ?? 2) as Place["priceLevel"],
    emoji: raw.emoji ?? "📍",
    gradient: (raw.gradient ?? ["#64748B", "#94A3B8"]) as [string, string],
    photoRef: `${gcp}/photos/${raw.id}`,
    diningStyle: raw.diningStyle as Place["diningStyle"],
    mealSlot: raw.mealSlot as Place["mealSlot"],
    description: raw.description,
    tip: raw.tip,
    bestTime: raw.bestTime,
  });
  return [
    ...data.attractions.map((r) => convert(r, "attraction")),
    ...data.restaurants.map((r) => convert(r, "restaurant")),
    ...data.cafes.map((r) => convert(r, "cafe")),
  ];
}

const PLACE_MAP: Record<string, Place[]> = Object.fromEntries(
  CURATED_IDS.map((id) => [
    id,
    toPlaces(id, (RAW_PLACES as Record<string, RawPlaceSet>)[id]),
  ]),
);

/** 좌표에서 약 distKm 만큼 떨어진 지점을 만든다 (방위각은 난수로) */
function offsetPoint(
  lat: number,
  lng: number,
  rnd: () => number,
  distKm: number,
): { lat: number; lng: number } {
  const angle = rnd() * Math.PI * 2;
  const dLat = (distKm * Math.cos(angle)) / 111;
  const dLng = (distKm * Math.sin(angle)) / (111 * Math.cos((lat * Math.PI) / 180));
  return { lat: Number((lat + dLat).toFixed(5)), lng: Number((lng + dLng).toFixed(5)) };
}

/* ── 5. 일반 가이드(합성) 데이터 생성기 ─────────────────────
 * 큐레이션 데이터가 없는 도시에도 모든 탭이 동작하도록,
 * 도시 좌표·동네·비용 티어에서 결정적으로 가이드를 생성한다.
 * 실제 업소 정보가 아니므로 UI 에서 "일반 가이드"로 명시한다.
 * ──────────────────────────────────────────────────────────── */

/**
 * 관광지 유형 — ticket 은 "하루 입장료 예산" 대비 비율 (0 = 무료)
 */
const ATTRACTION_TEMPLATES: { name: string; emoji: string; ticket: number; min: number }[] = [
  { name: "시립 박물관", emoji: "🏛️", ticket: 0.3, min: 100 },
  { name: "역사 지구 산책로", emoji: "🏘️", ticket: 0.1, min: 90 },
  { name: "중앙 시장", emoji: "🧺", ticket: 0, min: 75 },
  { name: "전통 공방 거리", emoji: "🧵", ticket: 0.08, min: 80 },
  { name: "도시 전망대", emoji: "🌆", ticket: 0.3, min: 60 },
  { name: "도심 공원", emoji: "🌳", ticket: 0.15, min: 75 },
  { name: "고택 문화 거리", emoji: "🏯", ticket: 0.1, min: 90 },
  { name: "강변 산책로", emoji: "🌊", ticket: 0, min: 60 },
  { name: "미술관", emoji: "🖼️", ticket: 0.35, min: 90 },
  { name: "수산 시장", emoji: "🐟", ticket: 0, min: 60 },
];

/**
 * 맛집 유형 — cost 는 "1일 식사 예산" 대비 1끼 비율
 * (점심 0.2~0.35, 저녁 0.35~0.9 로 분포)
 */
const RESTAURANT_TEMPLATES: { name: string; emoji: string; cost: number; level: number; style: string }[] = [
  { name: "로컬 식당", emoji: "🍽️", cost: 0.4, level: 2, style: "local" },
  { name: "시장 분식", emoji: "🍢", cost: 0.18, level: 1, style: "streetfood" },
  { name: "가게거리 맛집", emoji: "🍜", cost: 0.24, level: 1, style: "local" },
  { name: "이자카야", emoji: "🍶", cost: 0.48, level: 2, style: "izakaya" },
  { name: "차이나테랑", emoji: "🥟", cost: 0.3, level: 2, style: "local" },
  { name: "해산물 레스토랑", emoji: "🦐", cost: 0.62, level: 3, style: "local" },
  { name: "정통 디너", emoji: "🍽️", cost: 0.85, level: 3, style: "fine" },
  { name: "길거리 타코", emoji: "🌮", cost: 0.26, level: 1, style: "streetfood" },
  { name: "브런치 카페", emoji: "🥞", cost: 0.3, level: 2, style: "cafe" },
  { name: "길거리 국수", emoji: "🍲", cost: 0.2, level: 1, style: "local" },
];

const CAFE_TEMPLATES = [
  { name: "로스터리 카페", emoji: "☕", cost: 0.12 },
  { name: "테라스 카페", emoji: "🥐", cost: 0.18 },
  { name: "핸드드립 바", emoji: "🫖", cost: 0.15 },
  { name: "베이커리 카페", emoji: "🥨", cost: 0.16 },
];

/**
 * 비용 보정 계수
 * 도시의 avgFoodCost / avgTicketCost 에 이미 비용 티어가 반영되어 있으므로 추가 보정은 하지 않는다.
 */
const cityCostFactor = 1;

/** 큐레이션 없는 도시의 장소 가이드 생성 */
export function buildSyntheticPlaces(city: City): Place[] {
  const rnd = mulberry32(hashSeed(`places|${city.id}`));
  const k = cityCostFactor;
  const foodBase = city.avgFoodCost * k;
  const ticketBase = city.avgTicketCost * k;
  const out: Place[] = [];

  ATTRACTION_TEMPLATES.forEach((t, i) => {
    const district = city.districts[i % city.districts.length];
    const p = offsetPoint(city.center.lat, city.center.lng, rnd, 0.6 + rnd() * 2.6);
    out.push({
      id: `${city.id}-syn-a${i}`,
      name: `${district} ${t.name}`,
      nameEn: `${district} ${t.name}`,
      category: "attraction",
      categoryLabel: "관광지",
      lat: p.lat,
      lng: p.lng,
      address: `${city.nameKo} ${district}`,
      rating: Number((7.8 + rnd() * 1.7).toFixed(1)),
      reviewCount: Math.round(800 + rnd() * 24000),
      durationMin: t.min,
      ticketPrice: Math.round((ticketBase * t.ticket) / 100) * 100,
      mealCost: 0,
      priceLevel: t.ticket >= 0.3 ? 3 : 2,
      emoji: t.emoji,
      gradient: PALETTE[(i + city.id.length) % PALETTE.length],
      photoRef: `${city.gcpPlaceId}/photos/syn-a${i}`,
      description: `${city.nameKo}의 대표 방문지를 유형별로 안내합니다.`,
      tip: "오전 시간대에 방문하면 사람이 적습니다.",
      bestTime: "09:00 - 11:00",
      synthetic: true,
    });
  });

  RESTAURANT_TEMPLATES.forEach((t, i) => {
    const district = city.districts[(i + 1) % city.districts.length];
    const p = offsetPoint(city.center.lat, city.center.lng, rnd, 0.4 + rnd() * 2.4);
    out.push({
      id: `${city.id}-syn-r${i}`,
      name: `${district} ${t.name}`,
      nameEn: `${district} ${t.name}`,
      category: "restaurant",
      categoryLabel: "맛집",
      lat: p.lat,
      lng: p.lng,
      address: `${city.nameKo} ${district}`,
      rating: Number((7.6 + rnd() * 1.9).toFixed(1)),
      reviewCount: Math.round(300 + rnd() * 18000),
      durationMin: 55 + Math.round(rnd() * 40),
      ticketPrice: 0,
      mealCost: Math.round(foodBase * t.cost),
      priceLevel: t.level as Place["priceLevel"],
      emoji: t.emoji,
      gradient: PALETTE[(i + 5) % PALETTE.length],
      photoRef: `${city.gcpPlaceId}/photos/syn-r${i}`,
      diningStyle: t.style as Place["diningStyle"],
      mealSlot: i % 3 === 2 ? "dinner" : "lunch",
      description: `${district} 지역의 ${t.name} 유형 가이드입니다.`,
      tip: "점심은 현지 식당, 저녁은 이자카야와 로컬 식당을 고릅니다.",
      bestTime: i % 3 === 2 ? "18:00 - 21:00" : "11:30 - 13:30",
      synthetic: true,
    });
  });

  CAFE_TEMPLATES.forEach((t, i) => {
    const district = city.districts[(i + 2) % city.districts.length];
    const p = offsetPoint(city.center.lat, city.center.lng, rnd, 0.3 + rnd() * 1.8);
    out.push({
      id: `${city.id}-syn-c${i}`,
      name: `${district} ${t.name}`,
      nameEn: `${district} ${t.name}`,
      category: "cafe",
      categoryLabel: "카페",
      lat: p.lat,
      lng: p.lng,
      address: `${city.nameKo} ${district}`,
      rating: Number((7.5 + rnd() * 1.8).toFixed(1)),
      reviewCount: Math.round(120 + rnd() * 6000),
      durationMin: 40,
      ticketPrice: 0,
      mealCost: Math.round(foodBase * t.cost),
      priceLevel: 2,
      emoji: t.emoji,
      gradient: PALETTE[(i + 8) % PALETTE.length],
      photoRef: `${city.gcpPlaceId}/photos/syn-c${i}`,
      diningStyle: "cafe",
      mealSlot: "lunch",
      description: `${district}의 ${t.name} 유형 가이드입니다.`,
      bestTime: "10:00 - 17:00",
      synthetic: true,
    });
  });

  return out;
}

/** 큐레이션 없는 도시의 숙소 가이드 생성 */
export function buildSyntheticStays(city: City): StayOption[] {
  const rnd = mulberry32(hashSeed(`stays|${city.id}`));
  const k = cityCostFactor;
  const base = city.avgFoodCost * 2.6 * k; // 1인 1일 식비의 2.6배를 야간가 기준으로
  const defs: {
    type: StayOption["type"];
    typeLabel: string;
    emoji: string;
    mult: number;
    rating: number;
    desc: string;
  }[] = [
    { type: "guesthouse", typeLabel: "게스트하우스", emoji: "🏠", mult: 0.55, rating: 8.3, desc: "도착지에서 가장 저렴한 숙소 유형입니다." },
    { type: "guesthouse", typeLabel: "호스텔", emoji: "🎒", mult: 0.4, rating: 8.1, desc: "1인실과 도미토리 객실이 있습니다." },
    { type: "airbnb", typeLabel: "에어비앤비", emoji: "🏡", mult: 0.95, rating: 9.0, desc: "주방이 있는 인테리어 민박입니다." },
    { type: "guesthouse", typeLabel: "게스트하우스", emoji: "🏩", mult: 0.7, rating: 8.6, desc: "도심 중심부의 조용한 소규모 숙소입니다." },
    { type: "hotel", typeLabel: "호텔", emoji: "🏨", mult: 1.35, rating: 9.0, desc: "역에서 가깝고 교통이 편리한 호텔입니다." },
    { type: "hotel", typeLabel: "리조트", emoji: "🌴", mult: 2.1, rating: 9.3, desc: "부지까지 여유가 있어 휴양에 적합합니다." },
    { type: "hotel", typeLabel: "부티크 호텔", emoji: "🥂", mult: 1.8, rating: 9.2, desc: "인원이 적은 디자인 호텔입니다." },
  ];

  return defs.map((d, i) => {
    const district = city.districts[i % city.districts.length];
    const p = offsetPoint(city.center.lat, city.center.lng, rnd, 0.2 + rnd() * 2.2);
    const pricePerNight = Math.round((base * d.mult) / 1000) * 1000;
    const rating = Number(Math.min(9.7, d.rating + rnd() * 0.5).toFixed(1));
    return {
      id: `${city.id}-syn-s${i}`,
      name: `${district} ${d.typeLabel}`,
      nameEn: `${district} ${d.typeLabel}`,
      type: d.type,
      typeLabel: d.typeLabel,
      district,
      lat: p.lat,
      lng: p.lng,
      distanceFromCenterKm: Number(
        haversineKm({ lat: p.lat, lng: p.lng }, city.downtown).toFixed(2),
      ),
      pricePerNight,
      pricePerPerson: Math.round(pricePerNight / 2),
      rating,
      reviewCount: Math.round(200 + rnd() * 4000),
      amenities: ["무료 와이파이", "공용 주방", "세탁기"].slice(0, 2 + Math.round(rnd() * 2)),
      emoji: d.emoji,
      gradient: PALETTE[(i + 3) % PALETTE.length],
      scoreLabel: scoreLabel(rating),
      description: d.desc,
      freeCancellation: rnd() > 0.35,
      breakfastIncluded: rnd() > 0.6,
      synthetic: true,
    } satisfies StayOption;
  });
}

/** 큐레이션 없는 도시의 교통 가이드 생성 */
export function buildSyntheticTransport(city: City): {
  airportTransfers: TransportPass[];
  cityPasses: TransportPass[];
} {
  const t = city.transportTier;
  const k = cityCostFactor;
  const rail = Math.round((12000 + (t === "high" ? 14000 : t === "mid" ? 6000 : 2000)) * k / 1000) * 1000;
  const bus = Math.round((4000 + (t === "high" ? 5000 : t === "mid" ? 2500 : 1000)) * k / 1000) * 1000;
  const taxi = Math.round((30000 + (t === "high" ? 32000 : t === "mid" ? 14000 : 4000)) * k / 1000) * 1000;
  const day = Math.round((7000 + (t === "high" ? 7000 : t === "mid" ? 3000 : 1500)) * k / 1000) * 1000;
  const threeDay = Math.round(day * 2.6);
  const card = Math.round(day * 0.35 / 100) * 100;

  return {
    airportTransfers: [
      {
        id: `${city.id}-syn-t1`,
        name: "공항 직행 열차",
        nameEn: "Airport Express",
        kind: "airport_transfer",
        kindLabel: "공항 시내",
        price: rail,
        durationLabel: "약 45분",
        covers: [`${city.airport.nameKo} → ${city.downtown.name}`, "편도 요금"],
        emoji: "🚄",
        icon: "train",
        billing: "once",
        notes: "시내까지 직통으로 이동하는 가장 일반적인 수단입니다.",
        perDayEquivalent: rail,
      },
      {
        id: `${city.id}-syn-t2`,
        name: "공항 시내버스",
        nameEn: "Airport Bus",
        kind: "airport_transfer",
        kindLabel: "공항 시내",
        price: bus,
        durationLabel: "약 75분",
        covers: [`${city.airport.nameKo} → ${city.downtown.name}`, "편도 요금"],
        emoji: "🚌",
        icon: "bus",
        billing: "once",
        notes: "가장 저렴한 공항 이동 수단입니다.",
        perDayEquivalent: bus,
      },
      {
        id: `${city.id}-syn-t3`,
        name: "공항 택시",
        nameEn: "Airport Taxi",
        kind: "taxi_ride",
        kindLabel: "공항 시내",
        price: taxi,
        durationLabel: "약 35분",
        covers: [`${city.airport.nameKo} → ${city.downtown.name}`, "편도 요금"],
        emoji: "🚕",
        icon: "taxi",
        billing: "once",
        notes: "3인 이상이면 인원당으로는 저렴합니다.",
        perDayEquivalent: taxi,
      },
    ],
    cityPasses: [
      {
        id: `${city.id}-syn-p1`,
        name: "시내 교통 1일권",
        nameEn: "City Pass 1-day",
        kind: "city_pass",
        kindLabel: "시내 패스",
        price: day,
        durationLabel: "24시간",
        covers: ["시내 지하철과 버스 전 노선"],
        emoji: "🚇",
        icon: "subway",
        billing: "once",
        notes: "하루에 4회 이상 탈 때가 이득입니다.",
        perDayEquivalent: day,
        recommended: true,
      },
      {
        id: `${city.id}-syn-p2`,
        name: "시내 교통 3일권",
        nameEn: "City Pass 3-day",
        kind: "city_pass",
        kindLabel: "시내 패스",
        price: threeDay,
        durationLabel: "72시간",
        covers: ["시내 지하철과 버스", "72시간 무제한"],
        emoji: "🎟️",
        icon: "subway",
        billing: "once",
        notes: "3박 이상 일정에서 가장 효율적입니다.",
        perDayEquivalent: Math.round(threeDay / 3),
        recommended: true,
      },
      {
        id: `${city.id}-syn-p3`,
        name: "교통 카드",
        nameEn: "Travel Card",
        kind: "single_ticket",
        kindLabel: "개별권",
        price: card,
        durationLabel: "1회 이동",
        covers: ["1회 이동권"],
        emoji: "🎫",
        icon: "subway",
        billing: "once",
        notes: "이동 횟수가 적을 때만 유리합니다.",
        perDayEquivalent: card,
      },
      {
        id: `${city.id}-syn-p4`,
        name: "자전거 대여",
        nameEn: "Bike Rental",
        kind: "taxi_ride",
        kindLabel: "자전거",
        price: Math.round(day * 0.45),
        durationLabel: "1일",
        covers: ["도심 이동", "지하 무료 주차"],
        emoji: "🚲",
        icon: "walk",
        billing: "per_day",
        notes: "도심 거리가 짧으면 가장 저렴합니다.",
        perDayEquivalent: Math.round(day * 0.45),
      },
    ],
  };
}

/* ── 6. 조회 API (큐레이션 우선, 없으면 합성 데이터) ────── */

export function getPlaces(cityId: string): Place[] {
  return PLACE_MAP[cityId] ?? buildSyntheticPlaces(CITY_MAP[cityId]);
}

export function getAttractions(cityId: string) {
  return getPlaces(cityId).filter((p) => p.category === "attraction");
}

export function getRestaurants(cityId: string) {
  return getPlaces(cityId).filter((p) => p.category === "restaurant");
}

export function getCafes(cityId: string) {
  return getPlaces(cityId).filter((p) => p.category === "cafe");
}

const STAY_TYPE_LABEL: Record<StayOption["type"], string> = {
  hotel: "호텔",
  guesthouse: "게스트하우스",
  airbnb: "에어비앤비",
};

/** Booking.com 스타일 평점 등급 라벨 */
function scoreLabel(rating: number) {
  if (rating >= 9.0) return "수퍼리어";
  if (rating >= 8.7) return "아주 좋음";
  if (rating >= 8.0) return "좋음";
  return "평범";
}

/** JSON → StayOption 변환 (도심까지 거리는 haversine으로 계산) */
function toStays(cityId: string, raw: RawStay[]): StayOption[] {
  const city = CITY_MAP[cityId];
  return raw.map((r) => ({
    id: r.id,
    name: r.name,
    nameEn: r.nameEn ?? r.name,
    type: r.type,
    typeLabel: STAY_TYPE_LABEL[r.type as StayOption["type"]] ?? r.typeLabel ?? "숙소",
    district: r.district,
    lat: r.lat,
    lng: r.lng,
    distanceFromCenterKm: Number(
      haversineKm({ lat: r.lat, lng: r.lng }, city.downtown).toFixed(2),
    ),
    pricePerNight: r.pricePerNight,
    pricePerPerson: Math.round(r.pricePerNight / 2),
    rating: r.rating,
    reviewCount: r.reviewCount,
    amenities: r.amenities,
    emoji: r.emoji,
    gradient: r.gradient as [string, string],
    scoreLabel: scoreLabel(r.rating),
    description: r.description,
    freeCancellation: r.freeCancellation,
    breakfastIncluded: r.breakfastIncluded,
  }));
}

const STAY_MAP: Record<string, StayOption[]> = Object.fromEntries(
  CURATED_IDS.map((id) => [
    id,
    toStays(id, (RAW_STAYS as Record<string, RawStay[]>)[id]),
  ]),
);

export function getStays(cityId: string): StayOption[] {
  return STAY_MAP[cityId] ?? buildSyntheticStays(CITY_MAP[cityId]);
}

export function getTransport(cityId: string): {
  airportTransfers: TransportPass[];
  cityPasses: TransportPass[];
} {
  const raw = (RAW_TRANSPORT as Record<string, { airportTransfers: TransportPass[]; cityPasses: TransportPass[] }>)[cityId];
  if (raw) return raw;
  return buildSyntheticTransport(CITY_MAP[cityId]);
}

/** 출발 공항 좌표·계수 조회 */
export function getDepartureAirport(code: string) {
  return DEPARTURE_AIRPORTS.find((a) => a.code === code) ?? DEPARTURE_AIRPORTS[0];
}

/** 도시 검색 (한글·영문·국가·동네·태그) */
export function searchCities(query: string): City[] {
  const q = query.trim().toLowerCase();
  if (!q) return CITIES;
  const words = q.split(/\s+/);
  return CITIES.filter((c) => {
    const haystack = [
      c.nameKo,
      c.nameEn,
      c.countryKo,
      c.countryEn,
      c.airport.code,
      ...c.keywords,
      ...c.districts,
    ]
      .join(" ")
      .toLowerCase();
    return words.every((w) => haystack.includes(w));
  });
}