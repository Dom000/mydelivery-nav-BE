import type { RoutePoint, ActivePoint } from '../types';
import { point as turfPoint, lineString } from '@turf/helpers';
import midpoint from '@turf/midpoint';
import length from '@turf/length';
import along from '@turf/along';

export function toTurfPointCoords(coords: [number, number]): [number, number] {
  // convert [lat, lng] -> [lng, lat] for GeoJSON
  return [coords[1], coords[0]];
}

export function fromTurfCoords(coords: [number, number]): [number, number] {
  // convert [lng, lat] -> [lat, lng]
  return [coords[1], coords[0]];
}

export function computeMidpoint(
  a: [number, number],
  b: [number, number],
): [number, number] {
  const p1 = turfPoint(toTurfPointCoords(a));
  const p2 = turfPoint(toTurfPointCoords(b));
  const mid = midpoint(p1, p2);
  return fromTurfCoords(mid.geometry.coordinates as [number, number]);
}

export function computeSegmentMidpoint(
  pointA: RoutePoint,
  pointB: RoutePoint,
  indexA = 0,
  indexB = 1,
): ActivePoint {
  return {
    between: [pointA.label, pointB.label],
    coords: computeMidpoint(
      pointA.coords as [number, number],
      pointB.coords as [number, number],
    ),
    indexFrom: indexA,
    indexTo: indexB,
  };
}

export function initialActivePointFromPoints(
  points: RoutePoint[],
): ActivePoint | null {
  if (!Array.isArray(points) || points.length === 0) return null;
  if (points.length === 1) {
    return {
      coords: points[0].coords as [number, number],
      between: [points[0].label, points[0].label],
      indexFrom: 0,
      indexTo: 0,
    };
  }
  return computeSegmentMidpoint(points[0], points[1], 0, 1);
}

export function allSegmentMidpoints(points: RoutePoint[]): ActivePoint[] {
  const out: ActivePoint[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    out.push(computeSegmentMidpoint(points[i], points[i + 1], i, i + 1));
  }
  return out;
}

// Returns a point along the full route given a fraction [0..1]. Uses Turf `length` and `along`.
export function pointAlongRoute(
  points: RoutePoint[],
  fraction: number,
): ActivePoint | null {
  if (!Array.isArray(points) || points.length === 0) return null;
  const coords = points.map((p) =>
    toTurfPointCoords(p.coords as [number, number]),
  );
  const line = lineString(coords);
  const totalKm = length(line, { units: 'kilometers' });
  const targetKm = Math.max(0, Math.min(1, fraction)) * totalKm;
  const pt = along(line, targetKm, { units: 'kilometers' });
  return {
    coords: fromTurfCoords(pt.geometry.coordinates as [number, number]),
  } as ActivePoint;
}
