import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PackageStatus } from '@prisma/client';
import { point as turfPoint, distance as turfDistance } from '@turf/turf';
import prisma from '../prisma/client';
import { toTurfPointCoords } from '../utils/geo';
import { RoutePoints } from 'src/types';

@Injectable()
export class SimulationService {
  private readonly logger = new Logger(SimulationService.name);

  @Cron(CronExpression.EVERY_2_HOURS)
  async handleCron() {
    this.logger.log('Simulation cron running: advancing in-transit deliveries');

    try {
      const deliveries = await prisma.delivery.findMany({
        where: { status: PackageStatus.IN_TRANSIT },
        include: { routes: true, package: true },
      });

      if (deliveries.length === 0) {
        this.logger.log(
          'No in-transit deliveries found, skipping simulation step',
        );
        return;
      }

      this.logger.debug(
        `Found ${deliveries.length} in-transit deliveries to simulate`,
      );

      const now = Date.now();

      for (const delivery of deliveries) {
        const route = delivery.routes;
        if (!route || !route.points) continue;

        const points: RoutePoints = route.points as any;
        if (!Array.isArray(points) || points.length === 0) continue;

        if (points.length === 1) {
          const last = points[0];

          await prisma.route.update({
            where: { id: route.id },
            data: {
              currentPoint: {
                between: [last.label, last.label],
                coords: last.coords,
                indexFrom: 0,
                indexTo: 0,
              } as any,
            },
          });

          await prisma.delivery.update({
            where: { id: delivery.id },
            data: { status: PackageStatus.DELIVERED },
          });
          await prisma.package.update({
            where: { id: delivery.packageId },
            data: { status: PackageStatus.DELIVERED },
          });

          continue;
        }

        const elapsedSeconds = Math.max(
          0,
          Math.floor((now - new Date(route.updatedAt).getTime()) / 1000),
        );
        if (elapsedSeconds === 0) continue;

        const updatedPoints = points.map((p) => ({ ...p }));
        const clampIndex = Math.max(0, points.length - 2);
        let currentIndex = Math.min(
          Math.max((route.currentPoint as any)?.indexFrom ?? 0, 0),
          clampIndex,
        );
        let currentCoords = ((route.currentPoint as any)?.coords ??
          points[currentIndex].coords) as [number, number];
        let remainingSeconds = elapsedSeconds;
        let newCurrentPoint: any = route.currentPoint;

        while (remainingSeconds > 0 && currentIndex < points.length - 1) {
          const start = points[currentIndex].coords as [number, number];
          const end = points[currentIndex + 1].coords as [number, number];

          const segKm = turfDistance(
            turfPoint(toTurfPointCoords(start)),
            turfPoint(toTurfPointCoords(end)),
            { units: 'kilometers' },
          );
          const curKm = turfDistance(
            turfPoint(toTurfPointCoords(start)),
            turfPoint(toTurfPointCoords(currentCoords)),
            { units: 'kilometers' },
          );

          const currentFrac =
            segKm > 0 ? Math.min(1, Math.max(0, curKm / segKm)) : 0;
          const originalDuration = Number(
            updatedPoints[currentIndex].durationToNext || 0,
          );

          if (originalDuration <= 0) {
            updatedPoints[currentIndex].durationToNext = 0;
            currentCoords = end;
            currentIndex += 1;
            continue;
          }

          const secondsLeftOnSegment = Math.max(
            0,
            Math.round(originalDuration * (1 - currentFrac)),
          );

          if (remainingSeconds >= secondsLeftOnSegment) {
            remainingSeconds -= secondsLeftOnSegment;
            updatedPoints[currentIndex].durationToNext = 0;
            currentCoords = end;
            currentIndex += 1;

            if (currentIndex >= points.length - 1) {
              const last = points[points.length - 1];
              newCurrentPoint = {
                between: [last.label, last.label],
                coords: last.coords,
                indexFrom: points.length - 1,
                indexTo: points.length - 1,
              };

              await prisma.delivery.update({
                where: { id: delivery.id },
                data: { status: PackageStatus.DELIVERED },
              });
              await prisma.package.update({
                where: { id: delivery.packageId },
                data: { status: PackageStatus.DELIVERED },
              });
              break;
            }

            newCurrentPoint = {
              between: [
                points[currentIndex].label,
                points[currentIndex + 1].label,
              ],
              coords: points[currentIndex].coords,
              indexFrom: currentIndex,
              indexTo: currentIndex + 1,
            };
            continue;
          }

          const advancedFrac = Math.min(
            1,
            currentFrac + remainingSeconds / originalDuration,
          );
          const interpLat = start[0] + (end[0] - start[0]) * advancedFrac;
          const interpLng = start[1] + (end[1] - start[1]) * advancedFrac;

          updatedPoints[currentIndex].durationToNext = Math.max(
            0,
            Math.round(originalDuration * (1 - advancedFrac)),
          );

          newCurrentPoint = {
            between: [
              points[currentIndex].label,
              points[currentIndex + 1].label,
            ],
            coords: [interpLat, interpLng],
            indexFrom: currentIndex,
            indexTo: currentIndex + 1,
          };
          remainingSeconds = 0;
        }

        await prisma.route.update({
          where: { id: route.id },
          data: {
            points: updatedPoints as any,
            currentPoint: newCurrentPoint as any,
          },
        });

        this.logger.debug(
          `Updated route ${route.id}: currentIndex=${newCurrentPoint?.indexFrom ?? 0} elapsedSeconds=${elapsedSeconds}`,
        );
      }
    } catch (err) {
      this.logger.error('Simulation cron failed', (err as Error).message);
    }
  }
}
