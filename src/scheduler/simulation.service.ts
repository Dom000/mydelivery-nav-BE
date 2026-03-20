import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import prisma from '../prisma/client';
import {
  lineString,
  point as turfPoint,
  distance as turfDistance,
  length as turfLength,
} from '@turf/turf';
import { fromTurfCoords, toTurfPointCoords } from '../utils/geo';
import { RoutePoints } from 'src/types';

@Injectable()
export class SimulationService {
  private readonly logger = new Logger(SimulationService.name);

  // Runs at top of every hour
  @Cron('0 0 * * * *')
  async handleCron() {
    this.logger.log('Simulation cron running: advancing in-transit deliveries');
    try {
      const deliveries = await prisma.delivery.findMany({
        where: { status: 'IN_TRANSIT' },
        include: { routes: true, package: true },
      });

      for (const delivery of deliveries) {
        const route = delivery.routes;
        if (!route || !route.points) continue;
        const points: RoutePoints = route.points as any;
        if (!Array.isArray(points) || points.length === 0) continue;

        // Build line coords in turf order [lng,lat]
        const coords = points.map((p) => toTurfPointCoords(p.coords));
        const line = lineString(coords as any);
        const totalKm = turfLength(line, { units: 'kilometers' });

        // Determine current position
        let currentCoords: [number, number] | null = null;
        if (route.currentPoint && (route.currentPoint as any).coords) {
          currentCoords = (route.currentPoint as any).coords as [
            number,
            number,
          ];
        } else {
          // default to first point
          currentCoords = points[0].coords as [number, number];
        }

        // Find nearest segment by comparing distance to segment midpoints
        let bestIndex = 0;
        let bestDist = Infinity;
        for (let i = 0; i < points.length - 1; i++) {
          const a = points[i].coords as [number, number];
          const b = points[i + 1].coords as [number, number];
          const midTurf = turfPoint(
            toTurfPointCoords([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]),
          );
          const curTurf = turfPoint(toTurfPointCoords(currentCoords));
          const d = turfDistance(curTurf, midTurf, { units: 'kilometers' });
          if (d < bestDist) {
            bestDist = d;
            bestIndex = i;
          }
        }

        // Compute fraction along the current segment
        const start = points[bestIndex].coords as [number, number];
        const end = points[bestIndex + 1].coords as [number, number];
        const segLine = lineString([
          toTurfPointCoords(start),
          toTurfPointCoords(end),
        ] as any);
        const segKm = turfLength(segLine, { units: 'kilometers' });
        const curKm = turfDistance(
          turfPoint(toTurfPointCoords(start)),
          turfPoint(toTurfPointCoords(currentCoords)),
          { units: 'kilometers' },
        );
        const frac = segKm > 0 ? Math.min(1, Math.max(0, curKm / segKm)) : 0;

        // Update durations: remaining durationToNext for current segment = original * (1 - frac)
        const updatedPoints = points.map((p) => ({ ...p }));
        const originalDuration = Number(
          updatedPoints[bestIndex].durationToNext || 0,
        );
        const remaining = Math.max(
          0,
          Math.round(originalDuration * (1 - frac)),
        );
        updatedPoints[bestIndex].durationToNext = remaining;

        // If we've passed the segment (frac >= 1 or remaining === 0), advance currentPoint to next segment midpoint
        let newCurrentPoint: any = route.currentPoint;
        if (frac >= 1 || remaining === 0) {
          if (bestIndex + 1 < points.length - 1) {
            // move to midpoint of next segment
            const ns = points[bestIndex + 1].coords as [number, number];
            const ne = points[bestIndex + 2].coords as [number, number];
            const midLat = (ns[0] + ne[0]) / 2;
            const midLng = (ns[1] + ne[1]) / 2;
            newCurrentPoint = {
              between: [
                points[bestIndex + 1].label,
                points[bestIndex + 2].label,
              ],
              coords: [midLat, midLng],
              indexFrom: bestIndex + 1,
              indexTo: bestIndex + 2,
            };
          } else {
            // reached final destination; set to last point coords
            const last = points[points.length - 1];
            newCurrentPoint = {
              between: [last.label, last.label],
              coords: last.coords,
              indexFrom: points.length - 1,
              indexTo: points.length - 1,
            };
            // mark delivery/package as delivered
            await prisma.delivery.update({
              where: { id: delivery.id },
              data: { status: 'DELIVERED' },
            });
            await prisma.package.update({
              where: { id: delivery.packageId },
              data: { status: 'DELIVERED' },
            });
          }
        } else {
          // set currentPoint to the interpolated point along segment
          const interpLat = start[0] + (end[0] - start[0]) * frac;
          const interpLng = start[1] + (end[1] - start[1]) * frac;
          newCurrentPoint = {
            between: [points[bestIndex].label, points[bestIndex + 1].label],
            coords: [interpLat, interpLng],
            indexFrom: bestIndex,
            indexTo: bestIndex + 1,
          };
        }

        // Persist updates
        await prisma.route.update({
          where: { id: route.id },
          data: {
            points: updatedPoints as any,
            currentPoint: newCurrentPoint as any,
          },
        });
        this.logger.debug(
          `Updated route ${route.id}: bestIndex=${bestIndex} frac=${frac.toFixed(3)} remaining=${remaining}`,
        );
      }
    } catch (err) {
      this.logger.error('Simulation cron failed', (err as Error).message);
    }
  }
}
