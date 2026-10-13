// 자동 생성된 도시별 데이터 맵 (scripts/gen-imports.cjs 로 생성)
// 도시를 추가할 places/stays/transport 폴더에 파일을 넣고 이 스크립트를 다시 돌리세요.
import baliPlaces from "@/data/places/bali.json";
import bangkokPlaces from "@/data/places/bangkok.json";
import beijingPlaces from "@/data/places/beijing.json";
import chengduPlaces from "@/data/places/chengdu.json";
import chiangmaiPlaces from "@/data/places/chiangmai.json";
import fukuokaPlaces from "@/data/places/fukuoka.json";
import hanoiPlaces from "@/data/places/hanoi.json";
import jejuPlaces from "@/data/places/jeju.json";
import kyotoPlaces from "@/data/places/kyoto.json";
import nagoyaPlaces from "@/data/places/nagoya.json";
import osakaPlaces from "@/data/places/osaka.json";
import parisPlaces from "@/data/places/paris.json";
import romePlaces from "@/data/places/rome.json";
import sapporoPlaces from "@/data/places/sapporo.json";
import shanghaiPlaces from "@/data/places/shanghai.json";
import tokyoPlaces from "@/data/places/tokyo.json";
import baliStays from "@/data/stays/bali.json";
import bangkokStays from "@/data/stays/bangkok.json";
import beijingStays from "@/data/stays/beijing.json";
import chengduStays from "@/data/stays/chengdu.json";
import chiangmaiStays from "@/data/stays/chiangmai.json";
import fukuokaStays from "@/data/stays/fukuoka.json";
import hanoiStays from "@/data/stays/hanoi.json";
import jejuStays from "@/data/stays/jeju.json";
import kyotoStays from "@/data/stays/kyoto.json";
import nagoyaStays from "@/data/stays/nagoya.json";
import osakaStays from "@/data/stays/osaka.json";
import parisStays from "@/data/stays/paris.json";
import romeStays from "@/data/stays/rome.json";
import sapporoStays from "@/data/stays/sapporo.json";
import shanghaiStays from "@/data/stays/shanghai.json";
import tokyoStays from "@/data/stays/tokyo.json";
import baliTransport from "@/data/transport/bali.json";
import bangkokTransport from "@/data/transport/bangkok.json";
import beijingTransport from "@/data/transport/beijing.json";
import chengduTransport from "@/data/transport/chengdu.json";
import chiangmaiTransport from "@/data/transport/chiangmai.json";
import fukuokaTransport from "@/data/transport/fukuoka.json";
import hanoiTransport from "@/data/transport/hanoi.json";
import jejuTransport from "@/data/transport/jeju.json";
import kyotoTransport from "@/data/transport/kyoto.json";
import nagoyaTransport from "@/data/transport/nagoya.json";
import osakaTransport from "@/data/transport/osaka.json";
import parisTransport from "@/data/transport/paris.json";
import romeTransport from "@/data/transport/rome.json";
import sapporoTransport from "@/data/transport/sapporo.json";
import shanghaiTransport from "@/data/transport/shanghai.json";
import tokyoTransport from "@/data/transport/tokyo.json";

/** 도시 ID 목록 (장소 데이터가 있는 도시) */
export const CURATED_IDS = [
  "bali",
  "bangkok",
  "beijing",
  "chengdu",
  "chiangmai",
  "fukuoka",
  "hanoi",
  "jeju",
  "kyoto",
  "nagoya",
  "osaka",
  "paris",
  "rome",
  "sapporo",
  "shanghai",
  "tokyo",
] as const;

export const RAW_PLACES = {
  bali: baliPlaces,
  bangkok: bangkokPlaces,
  beijing: beijingPlaces,
  chengdu: chengduPlaces,
  chiangmai: chiangmaiPlaces,
  fukuoka: fukuokaPlaces,
  hanoi: hanoiPlaces,
  jeju: jejuPlaces,
  kyoto: kyotoPlaces,
  nagoya: nagoyaPlaces,
  osaka: osakaPlaces,
  paris: parisPlaces,
  rome: romePlaces,
  sapporo: sapporoPlaces,
  shanghai: shanghaiPlaces,
  tokyo: tokyoPlaces,
};

export const RAW_STAYS = {
  bali: baliStays,
  bangkok: bangkokStays,
  beijing: beijingStays,
  chengdu: chengduStays,
  chiangmai: chiangmaiStays,
  fukuoka: fukuokaStays,
  hanoi: hanoiStays,
  jeju: jejuStays,
  kyoto: kyotoStays,
  nagoya: nagoyaStays,
  osaka: osakaStays,
  paris: parisStays,
  rome: romeStays,
  sapporo: sapporoStays,
  shanghai: shanghaiStays,
  tokyo: tokyoStays,
};

export const RAW_TRANSPORT = {
  bali: baliTransport,
  bangkok: bangkokTransport,
  beijing: beijingTransport,
  chengdu: chengduTransport,
  chiangmai: chiangmaiTransport,
  fukuoka: fukuokaTransport,
  hanoi: hanoiTransport,
  jeju: jejuTransport,
  kyoto: kyotoTransport,
  nagoya: nagoyaTransport,
  osaka: osakaTransport,
  paris: parisTransport,
  rome: romeTransport,
  sapporo: sapporoTransport,
  shanghai: shanghaiTransport,
  tokyo: tokyoTransport,
};
