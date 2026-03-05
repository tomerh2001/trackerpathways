import { NextResponse } from "next/server";
import rawData from "@/data/trackers.json";
import { DataStructure } from "@/types";
import { searchRoutes } from "@/lib/routeSearch";

const data = rawData as unknown as DataStructure;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sourceRaw = searchParams.get("source") || "";
  const targetRaw = searchParams.get("target") || "";
  const maxJumps = Number.parseInt(searchParams.get("jumps") || "1", 10);
  const maxDaysStr = searchParams.get("days");
  const maxDays = maxDaysStr ? Number.parseInt(maxDaysStr, 10) : null;

  return NextResponse.json(
    searchRoutes(data, {
      sourceRaw,
      targetRaw,
      maxJumps,
      maxDays,
    })
  );
}
