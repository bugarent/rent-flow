export type PopularAirportsLayout = "grid" | "slider";

export function normalizePopularAirportsLayout(value: unknown): PopularAirportsLayout {
  return value === "slider" ? "slider" : "grid";
}
