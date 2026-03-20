import { Injectable, BadRequestException } from '@nestjs/common';
import logger from '../utils/logger';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { validateRoutePoints } from '../types/schema';
import { initialActivePointFromPoints } from '../utils/geo';
import prisma from '../prisma/client';

@Injectable()
export class PackageService {
  async create(createPackageDto: CreatePackageDto) {
    // Validate route points at runtime
    try {
      validateRoutePoints(createPackageDto.route.points);
    } catch (err) {
      throw new BadRequestException(
        'Invalid route points: ' + (err as Error).message,
      );
    }

    let owner = await prisma.user.findUnique({
      where: { email: createPackageDto.ownerEmail },
    });

    if (!owner) {
      logger.warn(
        'Owner not found for package creation; creating placeholder user',
        {
          ownerEmail: (createPackageDto as any).ownerEmail,
          ownerId: (createPackageDto as any).ownerId,
        },
      );
      // create a placeholder owner if email provided, otherwise throw
      if ((createPackageDto as any).ownerEmail) {
        owner = await prisma.user.create({
          data: {
            email: (createPackageDto as any).ownerEmail,
            role: 'USER',
            permissions: [],
            name: ((createPackageDto as any).ownerEmail || '').split('@')[0],
          },
        });
      } else {
        throw new BadRequestException(
          'Owner not found and no owner email provided',
        );
      }
    }

    // Persist package and related delivery/route
    const pkg = await prisma.package.create({
      data: {
        name: createPackageDto.name,
        weight: createPackageDto.weight,
        content: createPackageDto.content,
        images: createPackageDto.images || [],
        ownerId: owner.id,
        description: createPackageDto.description || '',
        status: createPackageDto.status || 'PENDING',
      },
    });

    const delivery = await prisma.delivery.create({
      data: { packageId: pkg.id, status: 'PENDING' },
    });

    await prisma.route.create({
      data: {
        deliveryId: delivery.id,
        origin: createPackageDto.route.origin,
        destination: createPackageDto.route.destination,
        points: createPackageDto.route.points as any,
        // set an initial `currentPoint` (midpoint between first two points or first point)
        currentPoint: initialActivePointFromPoints(
          createPackageDto.route.points as any,
        ) as any,
        distance: createPackageDto.route.distance,
      },
    });

    return pkg;
  }

  async findAll() {
    return prisma.package
      .findMany({
        include: {
          deliveries: {
            include: { routes: true, driver: true },
          },
        },
      })
      .then((pkgs) =>
        pkgs.map((p) => ({
          ...p,
          id: String(p.id).toUpperCase(),
        })),
      );
  }

  async findOne(id: string) {
    if (!id) return null;

    const pkg = await prisma.package.findUnique({
      where: { id },
      include: {
        deliveries: {
          include: { routes: true, driver: true },
        },
      },
    });

    if (!pkg) return null;

    // delivery relation is singular in schema but may be returned as object
    const delivery = (pkg as any).deliveries || null;

    // prepare route info
    const route = delivery?.routes || null;

    // compute remaining estimated duration (sum of durationToNext from current point onwards)
    let remainingSeconds = 0;
    if (route && Array.isArray(route.points)) {
      const pts: any[] = route.points as any[];

      // If a currentPoint exists with indexFrom, sum durations from indexFrom to end
      const currentIndex = route.currentPoint?.indexFrom ?? 0;
      for (let i = currentIndex; i < pts.length; i++) {
        const d = Number(pts[i].durationToNext || 0);
        remainingSeconds += isNaN(d) ? 0 : d;
      }
    }

    return {
      id: pkg.id,
      name: pkg.name,
      weight: pkg.weight,
      content: pkg.content,
      images: pkg.images,
      description: pkg.description,
      status: pkg.status,
      createdAt: pkg.createdAt,
      updatedAt: pkg.updatedAt,
      delivery: delivery
        ? {
            id: delivery.id,
            status: delivery.status,
            driver: delivery.driver
              ? {
                  id: delivery.driver.id,
                  name: delivery.driver.name,
                  email: delivery.driver.email,
                }
              : null,
            route: route
              ? {
                  id: route.id,
                  origin: route.origin,
                  destination: route.destination,
                  distance: route.distance,
                  points: route.points,
                  currentPoint: route.currentPoint,
                }
              : null,
            remainingSeconds,
          }
        : null,
    };
  }

  update(id: number, updatePackageDto: UpdatePackageDto) {
    return `This action updates a #${id} package`;
  }

  remove(id: number) {
    return `This action removes a #${id} package`;
  }
}
