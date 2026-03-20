export interface RoutePoint {
  label: string; // e.g. 'A', 'B', 'C'
  coords: [number, number]; // [lat, lng]
  durationToNext?: number; // seconds to next point
}

export type RoutePoints = RoutePoint[];
