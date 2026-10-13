import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { ko } from "date-fns/locale";

/** 1인 기준 / 전체 기준 가격 표시 모드 */
export type PriceMode = "total" | "perPerson";

/** 원화 포맷 (1234567 → "123만 4,567원" 또는 "1,234,567원") */
export function formatKrw(amount: number, opts?: { compact?: boolean }): string {
  const n = Math.round(amount);
  if (opts?.compact && Math.abs(n) >= 10000) {
    const man = n / 10000;
    const rounded = man >= 100 ? Math.round(man) : Math.round(man * 10) / 10;
    return `${rounded.toLocaleString("ko-KR")}만원`;
  }
  return `${n.toLocaleString("ko-KR")}원`;
}

/** 숫자만 (원 기호 제외) */
export function formatNumber(n: number) {
  return Math.round(n).toLocaleString("ko-KR");
}

/** 2026-05-03 → "5월 3일(일)" */
export function formatDateKo(iso: string) {
  return format(parseISO(iso), "M월 d일(E)", { locale: ko });
}

/** 2026-05-03 → "2026.05.03" */
export function formatDateShort(iso: string) {
  return format(parseISO(iso), "yyyy.MM.dd");
}

/** 요일 한 글자 */
export function weekdayKo(iso: string) {
  return format(parseISO(iso), "EEE", { locale: ko });
}

/** 야간 수 계산 (2026-05-03 ~ 2026-05-06 → 3박) */
export function nightsBetween(start: string, end: string) {
  return Math.max(1, differenceInCalendarDays(parseISO(end), parseISO(start)));
}

/** 2026-05-03 ~ 2026-05-06 → "3박 4일" */
export function tripLengthLabel(nights: number) {
  return `${nights}박 ${nights + 1}일`;
}

/** 분 → "2시간 15분" */
export function formatDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

/** 137 → "2시간 17분" (항공편 요약용) */
export function formatFlightDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}시간 ${m.toString().padStart(2, "0")}분`;
}

/** 오늘 기준 최소 출발일 (오늘+14일) */
export function minStartDate() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return format(d, "yyyy-MM-dd");
}

/** ISO 문자열에 일수 더하기 */
export function addDaysIso(iso: string, days: number) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return format(d, "yyyy-MM-dd");
}

/** 가격 표시 (토글 반영) */
export function price(amountPerPerson: number, travelers: number, mode: PriceMode) {
  return mode === "perPerson" ? amountPerPerson : amountPerPerson * travelers;
}