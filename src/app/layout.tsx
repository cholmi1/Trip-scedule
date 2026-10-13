import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/common/ThemeProvider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "TripCost · 가성비 최강 여행계획",
  description:
    "목적지·기간·인원·예산을 입력하면 최저가 항공, 숙박, 맛집, 관광, 현지 교통을 조합해 최고의 가성비 여행 일정을 자동으로 짜드립니다.",
  applicationName: "TripCost",
  keywords: ["여행계획", "가성비", "저가항공", "여행예산", "트리플코스트"],
  openGraph: {
    title: "TripCost · 가성비 최강 여행계획",
    description: "예산 하나로 가성비 여행을 자동 설계합니다.",
    type: "website",
    locale: "ko_KR",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* 한글 가독성을 위한 폰트 (오프라인 환경에선 시스템 폰트로 자동 폴백) */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
        style={
          {
            "--font-sans":
              "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif",
          } as React.CSSProperties
        }
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}