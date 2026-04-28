import { NextRequest, NextResponse } from "next/server"

/** Google Places API Nearby Search (legacy JSON). Key must be server-only (GOOGLE_PLACES_API_KEY). */
export async function POST(request: NextRequest) {
  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key) {
    return NextResponse.json(
      { error: "Google Places API key not configured" },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    const lat = Number(body.lat)
    const lng = Number(body.lng)
    const radiusMeters = Math.min(
      5000,
      Math.max(100, Number(body.radiusMeters) || 800)
    )

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: "Invalid lat or lng" }, { status: 400 })
    }

    const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json")
    url.searchParams.set("location", `${lat},${lng}`)
    url.searchParams.set("radius", String(radiusMeters))
    url.searchParams.set("type", "restaurant")
    url.searchParams.set("key", key)

    const res = await fetch(url.toString(), { cache: "no-store" })
    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to query Places API" },
        { status: 502 }
      )
    }

    const data = (await res.json()) as {
      status: string
      error_message?: string
      results?: Array<{
        place_id: string
        name: string
        vicinity?: string
        geometry?: { location: { lat: number; lng: number } }
      }>
    }

    if (data.status === "REQUEST_DENIED" || data.status === "INVALID_REQUEST") {
      return NextResponse.json(
        { error: data.error_message || `Places error: ${data.status}` },
        { status: 400 }
      )
    }

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return NextResponse.json(
        { error: data.error_message || `Places error: ${data.status}` },
        { status: 502 }
      )
    }

    const places =
      data.results?.map((r) => ({
        id: r.place_id,
        name: r.name,
        vicinity: r.vicinity,
        location: r.geometry?.location
          ? { lat: r.geometry.location.lat, lng: r.geometry.location.lng }
          : { lat, lng },
      })) ?? []

    return NextResponse.json({ places })
  } catch (e) {
    console.error("places/nearby error", e)
    return NextResponse.json(
      { error: "Failed to load nearby places" },
      { status: 500 }
    )
  }
}
