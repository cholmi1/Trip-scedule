"use client";

import { useState } from "react";
import { Download, FileImage, FileText, Loader2, Share2 } from "lucide-react";
import { formatKrw, tripLengthLabel } from "@/lib/format";
import type { TripPlan } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * PDF / 이미지 저장 및 공유
 * - 한글 폰트 문제를 피하기 위해 html2canvas 로 DOM 을 이미지화한 뒤 PDF 에 삽입한다.
 * - 이미지와 PDF 는 동일 파이프라인을 공유한다.
 */
export function ExportMenu({ plan }: { plan: TripPlan }) {
  const [busy, setBusy] = useState<null | "pdf" | "png">(null);
  const [toast, setToast] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  /** 캔버스를 이미지로 변환 */
  async function capture(): Promise<HTMLCanvasElement | null> {
    const node = document.getElementById("tripcost-export-area");
    if (!node) return null;
    const html2canvas = (await import("html2canvas")).default;
    return html2canvas(node, {
      scale: 2,
      backgroundColor:
        getComputedStyle(document.documentElement).getPropertyValue("--background").trim() ||
        "#ffffff",
      useCORS: true,
      logging: false,
    });
  }

  async function saveImage() {
    setBusy("png");
    try {
      const canvas = await capture();
      if (!canvas) return;
      const link = document.createElement("a");
      link.download = `tripcost-${plan.city.id}-${plan.request.startDate}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      setToast("이미지를 저장했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function savePdf() {
    setBusy("pdf");
    try {
      const canvas = await capture();
      if (!canvas) return;
      const { jsPDF } = await import("jspdf");
      const landscape = canvas.width > canvas.height;
      const pdf = new jsPDF({
        orientation: landscape ? "landscape" : "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`tripcost-${plan.city.id}-${plan.request.startDate}.pdf`);
      setToast("PDF를 저장했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function share() {
    const text = [
      `📍 TripCost 가성비 여행 계획`,
      `${plan.city.emoji} ${plan.city.nameKo} ${tripLengthLabel(plan.nights)} ${plan.request.travelers}명`,
      `💰 총 예상 ${formatKrw(plan.budget.totalTotal)} (1인 ${formatKrw(plan.budget.totalPerPerson)})`,
      `✈️ 항공 ${formatKrw(plan.bestFlight.pricePerPerson)} / 1인`,
      `🏨 숙소 ${plan.stay.name} (${plan.stay.rating.toFixed(1)}점)`,
      `🎯 가성비 점수 ${plan.valueScore}`,
    ].join("\n");

    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: "TripCost 여행 계획", text });
        return;
      } catch {
        /* 사용자가 취소한 경우 무시 */
      }
    }
    await navigator.clipboard.writeText(text);
    setToast("공유 텍스트를 복사했습니다.");
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> 내보내기
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>계획 저장 및 공유</DialogTitle>
            <DialogDescription>
              현재 대시보드 영역을 이미지로 렌더링한 뒤 PDF 또는 이미지로 저장합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Button onClick={savePdf} disabled={busy !== null} variant="brand" className="justify-start">
              {busy === "pdf" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              PDF로 저장
            </Button>
            <Button onClick={saveImage} disabled={busy !== null} variant="outline" className="justify-start">
              {busy === "png" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileImage className="h-4 w-4" />
              )}
              이미지로 저장
            </Button>
            <Button onClick={share} disabled={busy !== null} variant="outline" className="justify-start">
              <Share2 className="h-4 w-4" /> 공유하기
            </Button>
          </div>

          {toast && (
            <p className="rounded-lg bg-brand-soft px-3 py-2 text-center text-xs font-semibold text-brand-ink dark:text-brand">
              {toast}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}