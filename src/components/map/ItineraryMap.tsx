"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { TripPlan } from "@/lib/types";
import { formatKrw } from "@/lib/format";

/** 번호가 찍힌 마커 (기본 아이콘 애셋 의존 제거) */
function numberIcon(n: number, kind: string) {
  const bg =
    kind === "stay"
      ? "#111827"
      : kind === "attraction"
        ? "#FF385C"
        : kind === "restaurant"
          ? "#F59E0B"
          : kind === "cafe"
            ? "#0EA5E9"
            : "#64748B";
  return L.divIcon({
    className: "",
    html: `<div style="
      width:26px;height:26px;border-radius:9999px;background:${bg};color:#fff;
      display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;
      border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);
    ">${n}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  });
}

/** 지도 뷰를 itinerary 범위에 맞게 자동 조정 */
function FitBounds({ plan }: { plan: TripPlan }) {
  const map = useMap();
  useEffect(() => {
    const points: L.LatLngExpression[] = [
      [plan.stay.lat, plan.stay.lng],
      ...plan.itinerary.flatMap((d) =>
        d.parts.flatMap((p) =>
          p.items.map((i) => [i.place.lat, i.place.lng] as [number, number]),
        ),
      ),
    ];
    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    }
    // 일부러 plan 기준 1회만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, plan]);
  return null;
}

/** 지도 탭 */
export default function ItineraryMap({ plan }: { plan: TripPlan }) {
  /** 숙소 → 일자별 방문 장소 순서로 경로 생성 */
  const route = useMemo(() => {
    const seq: [number, number][] = [[plan.stay.lat, plan.stay.lng]];
    plan.itinerary.forEach((d) => {
      d.parts.forEach((p) =>
        p.items.forEach((i) => seq.push([i.place.lat, i.place.lng])),
      );
    });
    return seq;
  }, [plan]);

  /** 마커 목록 (호텔 + 장소) */
  const markers = useMemo(() => {
    const list: {
      lat: number;
      lng: number;
      n: number;
      kind: string;
      title: string;
      desc: string;
      day: number;
    }[] = [
      {
        lat: plan.stay.lat,
        lng: plan.stay.lng,
        n: 1,
        kind: "stay",
        title: plan.stay.name,
        desc: `${plan.stay.district} · ${plan.nights}박 · ${formatKrw(plan.stay.pricePerNight)} / 2인`,
        day: 0,
      },
    ];
    let n = 2;
    plan.itinerary.forEach((d) => {
      d.parts.forEach((p) =>
        p.items.forEach((i) => {
          list.push({
            lat: i.place.lat,
            lng: i.place.lng,
            n: n++,
            kind: i.place.category,
            title: i.place.name,
            desc:
              i.place.category === "attraction"
                ? `${i.place.categoryLabel} · 소요 ${i.place.durationMin}분 · 입장 ${formatKrw(i.place.ticketPrice)}`
                : `${i.place.categoryLabel} · 1인 약 ${formatKrw(i.place.mealCost)}`,
            day: d.day,
          });
        }),
      );
    });
    return list;
  }, [plan]);

  const center: [number, number] = [plan.city.center.lat, plan.city.center.lng];

  return (
    <div className="space-y-5">
      <div className="tc-card p-5">
        <h3 className="text-base font-bold">일정 동선 지도</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          숙소에서 출발해 일자별 방문 장소를 순서대로 연결한 동선입니다. 마커를 클릭하면 장소
          상세 정보를 볼 수 있습니다.
        </p>

        <div className="mt-4 overflow-hidden rounded-lg border">
          <MapContainer
            center={center}
            zoom={12}
            scrollWheelZoom={false}
            className="h-[420px] w-full sm:h-[520px]"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds plan={plan} />
            <Polyline
              positions={route}
              pathOptions={{ color: "#FF385C", weight: 3, opacity: 0.65, dashArray: "6 8" }}
            />
            {markers.map((m) => (
              <Marker
                key={`${m.day}-${m.n}-${m.lat}-${m.lng}`}
                position={[m.lat, m.lng]}
                icon={numberIcon(m.n, m.kind)}
              >
                <Popup>
                  <div style={{ minWidth: 180 }}>
                    <p style={{ fontWeight: 700, fontSize: 13 }}>{m.title}</p>
                    <p style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
                      {m.day === 0 ? "숙소" : `Day ${m.day} · ${m.desc}`}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* 범례 */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          {[
            { c: "bg-[#111827]", l: "숙소" },
            { c: "bg-[#FF385C]", l: "관광지" },
            { c: "bg-[#F59E0B]", l: "맛집" },
            { c: "bg-[#0EA5E9]", l: "카페" },
          ].map((x) => (
            <span key={x.l} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${x.c}`} />
              {x.l}
            </span>
          ))}
          <span className="ml-auto">총 {markers.length}개 지점</span>
        </div>
      </div>

      {/* 일자별 경로 요약 */}
      <div className="tc-card p-5">
        <h3 className="mb-3 text-sm font-bold">일자별 방문 순서</h3>
        <div className="space-y-4">
          {plan.itinerary.map((day) => {
            const items = day.parts.flatMap((p) => p.items);
            if (items.length === 0) return null;
            return (
              <div key={day.day}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-black text-primary-foreground">
                    {day.day}
                  </span>
                  <span className="text-xs font-bold">{day.dateLabel}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {day.totalDistanceKm}km
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-md bg-slate-800 px-2 py-1 text-[11px] font-bold text-white dark:bg-slate-700">
                    숙소
                  </span>
                  {items.map((i) => (
                    <span key={i.place.id} className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">→</span>
                      <span className="rounded-md border px-2 py-1 text-[11px] font-semibold">
                        {i.place.emoji} {i.place.name}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}