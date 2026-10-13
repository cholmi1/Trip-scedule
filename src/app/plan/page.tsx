import type { Metadata } from "next";
import PlanView from "@/components/plan/PlanView";

export const metadata: Metadata = {
  title: "TripCost · 여행 계획 결과",
  description: "항공·숙박·일정·교통·예산을 한눈에 비교하는 가성비 여행 계획",
};

export default function Page() {
  return <PlanView />;
}