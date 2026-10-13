"use client";

import { cn } from "@/lib/utils";
import { formatKrw } from "@/lib/format";
import { useTripStore } from "@/store/useTripStore";

interface Props {
  /** 1인 기준 금액 */
  perPerson: number;
  className?: string;
  /** 금액 앞 접두 라벨 */
  prefix?: string;
  /** 작은 글씨로 표시할지 */
  size?: "sm" | "md" | "lg" | "xl";
  showModeHint?: boolean;
}

const SIZE: Record<NonNullable<Props["size"]>, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
  xl: "text-3xl",
};

/**
 * 가격 표시 (1인 / 전체 토글 반영)
 * store의 priceMode 에 따라 1인가 또는 전체 금액을 보여준다.
 */
export function Price({
  perPerson,
  className,
  prefix,
  size = "md",
  showModeHint = false,
}: Props) {
  const priceMode = useTripStore((s) => s.priceMode);
  const travelers = useTripStore((s) => s.request.travelers);
  const value = priceMode === "perPerson" ? perPerson : perPerson * travelers;

  return (
    <span className={cn("font-bold tabular-nums", SIZE[size], className)}>
      {prefix}
      {formatKrw(value)}
      {showModeHint && (
        <span className="ml-1 text-[11px] font-normal text-muted-foreground">
          {priceMode === "perPerson" ? "/인" : `/${travelers}명`}
        </span>
      )}
    </span>
  );
}

/** 1인 / 전체 토글 버튼 */
export function PriceModeToggle({ className }: { className?: string }) {
  const priceMode = useTripStore((s) => s.priceMode);
  const setPriceMode = useTripStore((s) => s.setPriceMode);

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full bg-muted p-0.5 text-xs font-semibold",
        className,
      )}
    >
      {(
        [
          { key: "perPerson", label: "1인당" },
          { key: "total", label: "총액" },
        ] as const
      ).map((opt) => (
        <button
          key={opt.key}
          onClick={() => setPriceMode(opt.key)}
          className={cn(
            "rounded-full px-3 py-1 transition-colors",
            priceMode === opt.key
              ? "bg-background text-foreground shadow-soft"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}