import citiesRaw from "@/data/cities.json";
import staysRaw from "@/data/stays.json";
import transportRaw from "@/data/transport.json";
import tokyoPlaces from "@/data/places/tokyo.json";
import osakaPlaces from "@/data/places/osaka.json";
import kyotoPlaces from "@/data/places/kyoto.json";
import parisPlaces from "@/data/places/paris.json";
import romePlaces from "@/data/places/rome.json";
import bangkokPlaces from "@/data/places/bangkok.json";
import jejuPlaces from "@/data/places/jeju.json";

import type { City, Place, StayOption, TransportPass } from "./types";
import { haversineKm } from "./utils";

/* ────────────────────────────────────────────────────────────
 * Mock 데이터 로더
 * - 원본은 JSON, 여기서 타입 + 파생 필드를 채운다.
 * - 실제 연동 시 이 파일만 API 호출로 교체하면 된다.
 * ──────────────────────────────────────────────────────────── */

/** 도시 목록 */
export const CITIES = citiesRaw as City[];
export const CITY_MAP: Record<string, City> = Object.fromEntries(
  CITIES.map((c) => [c.id, c]),
);

/** 출발 공항 기본값 (인천) */
export const DEFAULT_AIRPORT = { code: "ICN", name: "인천국제공항" };

/** 출발 공항 후보 */
export const DEPARTURE_AIRPORTS = [
  { code: "GMP", name: "김포공항", city: "서울" },
  { code: "PUS", name: "부산공항", city: "부산" },
  { code: "CJU", name: "제주국제공항", city: "제주" },
  { code: "TAO", name: "칭다오공항", city: "인천" },
];

/** 장소 카테고리 표시 라벨 */
const CATEGORY_LABEL: Record<Place["category"], string> = {
  attraction: "관광지",
  restaurant: "맛집",
  cafe: "카페",
  shopping: "쇼핑",
};

/** JSON 라운드 장소 데이터 (선택 필드는运行时에 채워진다) */
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
  gradient?: [string, string];
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
  nameEn: string;
  type: StayOption["type"];
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
    // 사진은 외부 이미지 대신 그라디언트 카드 UI를 사용한다.
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

const PLACE_MAP: Record<string, Place[]> = {
  tokyo: toPlaces("tokyo", tokyoPlaces),
  osaka: toPlaces("osaka", osakaPlaces),
  kyoto: toPlaces("kyoto", kyotoPlaces),
  paris: toPlaces("paris", parisPlaces),
  rome: toPlaces("rome", romePlaces),
  bangkok: toPlaces("bangkok", bangkokPlaces),
  jeju: toPlaces("jeju", jejuPlaces),
};

/** 도시별 장소 전체 목록 */
export function getPlaces(cityId: string): Place[] {
  return PLACE_MAP[cityId] ?? [];
}

/** 도시별 관광지 */
export function getAttractions(cityId: string) {
  return getPlaces(cityId).filter((p) => p.category === "attraction");
}

/** 도시별 맛집 (점심 / 저녁 구분 가능) */
export function getRestaurants(cityId: string) {
  return getPlaces(cityId).filter((p) => p.category === "restaurant");
}

/** 도시별 카페 */
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
function toStays(cityId: string): StayOption[] {
  const city = CITY_MAP[cityId];
  const list = ((staysRaw as Record<string, RawStay[]>)[cityId] ?? []) as RawStay[];
  return list.map((raw) => ({
    id: raw.id,
    name: raw.name,
    nameEn: raw.nameEn,
    type: raw.type,
    typeLabel: STAY_TYPE_LABEL[raw.type as StayOption["type"]],
    district: raw.district,
    lat: raw.lat,
    lng: raw.lng,
    distanceFromCenterKm: Number(
      haversineKm({ lat: raw.lat, lng: raw.lng }, city.downtown).toFixed(2),
    ),
    pricePerNight: raw.pricePerNight,
    // 2인 1박 기준가 → 1인 1박가
    pricePerPerson: Math.round(raw.pricePerNight / 2),
    rating: raw.rating,
    reviewCount: raw.reviewCount,
    amenities: raw.amenities,
    emoji: raw.emoji,
    gradient: raw.gradient as [string, string],
    scoreLabel: scoreLabel(raw.rating),
    description: raw.description,
    freeCancellation: raw.freeCancellation,
    breakfastIncluded: raw.breakfastIncluded,
  }));
}

const STAY_MAP: Record<string, StayOption[]> = Object.fromEntries(
  CITIES.map((c) => [c.id, toStays(c.id)]),
);

/** 도시별 숙소 전체 */
export function getStays(cityId: string): StayOption[] {
  return STAY_MAP[cityId] ?? [];
}

/** 교통 데이터 */
export function getTransport(cityId: string): {
  airportTransfers: TransportPass[];
  cityPasses: TransportPass[];
} {
  const raw = (transportRaw as Record<string, { airportTransfers: TransportPass[]; cityPasses: TransportPass[] }>)[cityId];
  return {
    airportTransfers: raw?.airportTransfers ?? [],
    cityPasses: raw?.cityPasses ?? [],
  };
}

/** 도시 검색 (한글·영문·키워드) */
export function searchCities(query: string): City[] {
  const q = query.trim().toLowerCase();
  if (!q) return CITIES;
  return CITIES.filter((c) => {
    const haystack = [
      c.nameKo,
      c.nameEn,
      c.countryKo,
      c.countryEn,
      ...c.keywords,
      ...c.districts,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}