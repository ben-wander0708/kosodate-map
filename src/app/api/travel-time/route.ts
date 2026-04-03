import { NextRequest, NextResponse } from "next/server";

const GMAPS_BASE = "https://maps.googleapis.com/maps/api/distancematrix/json";

interface Destination {
  id: string;
  lat: number;
  lng: number;
}

interface ElementResult {
  duration_seconds: number;
}

async function fetchMode(
  origin: string,
  destStr: string,
  mode: string
): Promise<ElementResult[]> {
  const url = `${GMAPS_BASE}?origins=${origin}&destinations=${destStr}&mode=${mode}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK") {
    throw new Error(`Distance Matrix API error: ${data.status}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.rows[0].elements.map((el: any) => ({
    duration_seconds: el.status === "OK" ? el.duration.value : -1,
  }));
}

export async function POST(request: NextRequest) {
  try {
    const { origin, destinations } = (await request.json()) as {
      origin: { lat: number; lng: number };
      destinations: Destination[];
    };

    const originStr = `${origin.lat},${origin.lng}`;
    const destStr = destinations.map((d) => `${d.lat},${d.lng}`).join("|");

    const [walkResults, bikeResults, carResults] = await Promise.all([
      fetchMode(originStr, destStr, "walking"),
      fetchMode(originStr, destStr, "bicycling"),
      fetchMode(originStr, destStr, "driving"),
    ]);

    const results = destinations.map((dest, i) => ({
      id: dest.id,
      walk_minutes:
        walkResults[i].duration_seconds > 0
          ? Math.round(walkResults[i].duration_seconds / 60)
          : null,
      bike_minutes:
        bikeResults[i].duration_seconds > 0
          ? Math.round(bikeResults[i].duration_seconds / 60)
          : null,
      car_minutes:
        carResults[i].duration_seconds > 0
          ? Math.round(carResults[i].duration_seconds / 60)
          : null,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("travel-time API error:", error);
    return NextResponse.json(
      { error: "所要時間の取得に失敗しました" },
      { status: 500 }
    );
  }
}
