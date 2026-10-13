/* ────────────────────────────────────────────────────────────
 * TripCost 도메인 타입 정의
 * 모든 금액 단위는 KRW(원)로 통일한다.
 * ──────────────────────────────────────────────────────────── */

/** 도시 메타 정보 */
export interface City {
  id: string;
  nameKo: string;
  nameEn: string;
  countryKo: string;
  countryEn: string;
  emoji: string;
  /** Google Places 연동 시 사용할 place_id 접두어 (mock 시뮬레이션용) */
  gcpPlaceId: string;
  center: { lat: number; lng: number };
  /** 도심 기준 좌표 (숙박 '중심지 1km 이내' 판정 기준점) */
  downtown: { lat: number; lng: number; name: string };
  /** 도시권 공항 정보 (czas 없음 = reopen ui) */
  airport: { code: string; nameKo: string; nameEn: string };
  /** 동네 목록 (숙박 카드 라벨용) */
  districts: string[];
  /** 1인 1일 평균 식사비(KRW) */
  avgFoodCost: number;
  /** sightseeing��� 1일 평균 입장료 합계(KRW) */
  avgTicketCost: number;
  /** 교통 요금 기준(KRW) */
  transportTier: "low" | "mid" | "high";
  currency: string;
  lang: string;
  /** 소개 문구 */
  tagline: string;
  /** 대표 키워드 (자동완성 검색용) */
  keywords: string[];
  /** 카드 배경 그라디언트 */
  gradient: [string, string];
  /** 성수기/비수기 시즌 (가격 계수에 사용) */
  highSeasonMonths: number[];
}

/** 항공편 오퍼 (편도/왕복 1인 기준) */
export interface FlightOffer {
  id: string;
  airline: string;
  airlineCode: string;
  /** 왕복 1인 최저가(KRW) */
  pricePerPerson: number;
  /** 왕복 총가(KRW) */
  priceTotal: number;
  currency: string;
  /** 직항 여부 */
  direct: boolean;
  /** 경유지 목록 (직항이면 빈 배열) */
  via: string[];
  /** 편도 예상 비행시간(분) */
  durationMin: number;
  /** 왕복 총 소요시간 문자열 */
  durationLabel: string;
  departureDate: string;
  returnDate: string;
  /** 출국편/입국편 시간 ( convinience 표기용) */
  departTime: string;
  arriveTime: string;
  returnDepartTime: string;
  returnArriveTime: string;
  /** 왕복 직항 여부 */
  roundTripDirect: boolean;
  /** 기내 조건 */
  cabin: "lowcost" | "standard";
  baggage: string;
  seatsLeft: number;
  /** 가격 출처 (실제 연동 시 Skyscanner / Amadeus) */
  source: "Skyscanner" | "Amadeus";
  /** 제과세 포함 여부 */
  taxesIncluded: boolean;
  /** 항공권 자체 만족/가성비 점수 (0~10) */
  rating: number;
  /** 출발 공항 */
  fromAirport: string;
  toAirport: string;
  /** 탑승 추천 이유 */
  highlights: string[];
}

/** 숙박 옵션 */
export interface StayOption {
  id: string;
  name: string;
  nameEn: string;
  /** 호텔 / 게스트하우스 / 에어비앤비(민박) */
  type: "hotel" | "guesthouse" | "airbnb";
  typeLabel: string;
  district: string;
  lat: number;
  lng: number;
  /** 도심(다운타운)으로부터의 거리(km) */
  distanceFromCenterKm: number;
  /** 1박당 2인 기준 가격(KRW) */
  pricePerNight: number;
  /** 1인 1박당 가격(KRW) */
  pricePerPerson: number;
  rating: number; // 0~10 (Booking.com 척도)
  reviewCount: number;
  /** 편의시설 태그 */
  amenities: string[];
  /** 카드 썸네일 이모지/유형 */
  emoji: string;
  gradient: [string, string];
  /** Booking.com 스타일 등급 */
  scoreLabel: string;
  description: string;
  /** 무료 취소 여부 */
  freeCancellation: boolean;
  breakfastIncluded: boolean;
}

/** 하루 중 시간대 */
export type DayPart = "morning" | "afternoon" | "evening";

/** 장소(관광지/맛집/카페) */
export interface Place {
  id: string;
  name: string;
  nameEn: string;
  category: "attraction" | "restaurant" | "cafe" | "shopping";
  categoryLabel: string;
  lat: number;
  lng: number;
  address: string;
  /** 0~10 만족도/평점 (구글 플레이스 rating은 5점 척도 → 2배 환산) */
  rating: number;
  reviewCount: number;
  /** 1인 예상 소요시간(분) */
  durationMin: number;
  /** 1인 입장료(KRW, 무료는 0) */
  ticketPrice: number;
  /** 음식 1인 예상 비용(KRW) */
  mealCost: number;
  /** 가격대 (1~4) */
  priceLevel: 1 | 2 | 3 | 4;
  emoji: string;
  gradient: [string, string];
  /** Google Places photos 참고용 이미지 대체 텍스트 */
  photoRef: string;
  /** 맛집 유형 (로컬/이자카야/미식/스트리트푸드 등) */
  diningStyle?: "local" | "izakaya" | "streetfood" | "cafe" | "fine" | "market";
  /** 점심/저녁 추천 우선순위 */
  mealSlot?: "lunch" | "dinner";
  /** 설명 */
  description: string;
  /** 방문 팁 */
  tip?: string;
  /** 추천 시간대 (환경/혼잡도) */
  bestTime?: string;
}

/** 하루 일정 */
export interface DayPlan {
  day: number;
  date: string;
  dateLabel: string;
  /** 그날의 총 예상 비용(1인, KRW) */
  costPerPerson: number;
  parts: {
    part: DayPart;
    label: string;
    timeRange: string;
    items: ItineraryItem[];
  }[];
  /** 하루 총 이동거리(km) */
  totalDistanceKm: number;
  theme: string;
}

/** 일정 한 항목 */
export interface ItineraryItem {
  place: Place;
  /** 도보/지하철/버스 등 */
  transport: "walk" | "subway" | "bus" | "train" | "taxi";
  transportLabel: string;
  /** 직전 장소 → 현재 장소 이동 소요시간(분) */
  travelMin: number;
  distanceKm: number;
  cost: number;
  startTime: string;
  endTime: string;
}

/** 교통 패스/ 티켓 옵션 */
export interface TransportPass {
  id: string;
  name: string;
  nameEn: string;
  /** 공항-시내 / 시내 패스 */
  kind: "airport_transfer" | "city_pass" | "single_ticket" | "taxi_ride";
  kindLabel: string;
  price: number; // 1인 기준 KRW
  durationLabel: string;
  covers: string[];
  /** 해당 옵션이 메인이면 true */
  recommended?: boolean;
  emoji: string;
  /** 이동 수단 아이콘 구분 */
  icon: "walk" | "subway" | "bus" | "train" | "taxi";
  /** 결제는 1회 / 매일 */
  billing: "once" | "per_day";
  notes: string;
  /** 하루당 원가 환산 (billing이 per_day일 때 총액 계산용) */
  perDayEquivalent: number;
}

/** 교통 탭 탭 데이터 묶음 */
export interface TransportBundle {
  airportTransfers: TransportPass[];
  cityPasses: TransportPass[];
  /** 1인 기준 총 교통비(권장 조합 기준) */
  totalPerPerson: number;
  totalTotal: number;
  chosenIds: string[];
  /** 일자별 교통비 배분 */
  dailyBreakdown: { day: number; cost: number; label: string }[];
}

/** 예산 카테고리 */
export type BudgetCategory = "flight" | "stay" | "food" | "transport" | "activity";

/** 예산 브레이크다운 */
export interface BudgetBreakdown {
  items: {
    category: BudgetCategory;
    label: string;
    /** 1인 총액(KRW) */
    perPerson: number;
    /** 전체 총액(KRW) */
    total: number;
    /** 예산 대비 권장 비중(%) */
    targetRatio: number;
    color: string;
  }[];
  totalPerPerson: number;
  totalTotal: number;
  budget: number; // 1인 기준 예산 or 총 예산
  budgetTotal: number;
  /** 예산 초과 여부 */
  isOver: boolean;
  /** 예산 대비 사용률(%) */
  usageRatio: number;
  remainingPerPerson: number;
}

/** 절약 팁 */
export interface SavingTip {
  id: string;
  title: string;
  description: string;
  /** 절감액(1인 기준 KRW) */
  saveAmount: number;
  category: BudgetCategory;
  confidence: "high" | "medium" | "low";
  emoji: string;
}

/** 사용자의 여행 요청 */
export interface TripRequest {
  cityId: string;
  departureAirport: { code: string; name: string };
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  travelers: number;
  budgetTotal: number; // 총 예산(KRW)
  rooms: number;
}

/** 최종 여행 계획 */
export interface TripPlan {
  request: TripRequest;
  city: City;
  nights: number;
  days: number;
  /** 최적 출발일 (출발 3일 +/- 탐색 결과) */
  bestFlight: FlightOffer;
  /** 항공 검색 결과 3개 */
  flights: FlightOffer[];
  /** 항공 탐색 로그 (날짜별 최저가) */
  flightSearchLog: { date: string; price: number; weekday: string; deltaDays: number }[];
  stay: StayOption;
  stays: StayOption[];
  itinerary: DayPlan[];
  transport: TransportBundle;
  budget: BudgetBreakdown;
  tips: SavingTip[];
  /** 종합 가성비 점수 */
  valueScore: number;
  generatedAt: string;
}