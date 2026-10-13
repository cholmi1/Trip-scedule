import type { Metadata } from "next";
import HomeView from "@/components/home/HomeView";

export const metadata: Metadata = {
  title: "TripCost · 가성비 최강 여행계획",
};

export default function Page() {
  return <HomeView />;
}