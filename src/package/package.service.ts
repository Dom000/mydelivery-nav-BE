import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import logger from '../utils/logger';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { validateRoutePoints } from '../types/schema';
import { initialActivePointFromPoints } from '../utils/geo';
import prisma from '../prisma/client';
import { CloudinaryService } from './cloudinary.service';
import { EmailService } from 'src/email/email.service';
import { PackageStatus } from './dto/create-package.dto';

@Injectable()
export class PackageService {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly emailService: EmailService,
  ) {}

  async create(
    createPackageDto: CreatePackageDto,
    files: Express.Multer.File[] = [],
  ) {
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

    const uploadedImageUrls = await this.cloudinaryService.uploadImages(files);
    const imageUrls =
      uploadedImageUrls.length > 0
        ? uploadedImageUrls
        : (createPackageDto.images ?? []);

    // Persist package and related delivery/route
    const pkg = await prisma.package.create({
      data: {
        name: createPackageDto.name,
        weight: createPackageDto.weight,
        content: createPackageDto.content,
        images: imageUrls,
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

    await this.emailService.sendOrderStatusEmail({
      status: (pkg.status as PackageStatus) || PackageStatus.PENDING,
      orderId: String(pkg.id).toUpperCase(),
      customerEmail: owner.email,
      customerName: owner.name || owner.email.split('@')[0],
      destination: createPackageDto.route.destination,
      currentLocation: createPackageDto.route.origin,
      items: [
        {
          name: createPackageDto.content || createPackageDto.name,
          quantity: 1,
          imageurls: imageUrls,
        },
      ],
    });

    return pkg;
  }

  async findAllDeliveries() {
    const deliveries = await prisma.delivery.findMany({
      include: {
        package: { include: { owner: true } },
        routes: true,
        driver: true,
      },
    });

    return deliveries.map((d) => ({
      id: String(d.id).toUpperCase(),
      status: d.status,
      package: d.package
        ? {
            id: String(d.package.id).toUpperCase(),
            name: d.package.name,
            weight: d.package.weight,
            destination: d.routes?.destination ?? null,
            owner: d.package.owner
              ? {
                  id: String(d.package.owner.id).toUpperCase(),
                  name: d.package.owner.name,
                  email: d.package.owner.email,
                }
              : null,
          }
        : null,
      driver: d.driver
        ? { id: String(d.driver.id).toUpperCase(), name: d.driver.name }
        : null,
    }));
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

  async update(id: string, updatePackageDto: UpdatePackageDto) {
    if (!id) {
      throw new BadRequestException('Package id is required');
    }

    const normalizedId = id.toLowerCase();

    const existing = await prisma.package.findUnique({
      where: { id: normalizedId },
      include: {
        deliveries: {
          include: {
            routes: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Package not found');
    }

    const packageData: Record<string, unknown> = {};

    if (updatePackageDto.name !== undefined)
      packageData.name = updatePackageDto.name;
    if (updatePackageDto.weight !== undefined)
      packageData.weight = updatePackageDto.weight;
    if (updatePackageDto.content !== undefined)
      packageData.content = updatePackageDto.content;
    if (updatePackageDto.images !== undefined)
      packageData.images = updatePackageDto.images;
    if (updatePackageDto.description !== undefined)
      packageData.description = updatePackageDto.description;
    if (updatePackageDto.status !== undefined)
      packageData.status = updatePackageDto.status;

    if (updatePackageDto.ownerEmail !== undefined) {
      let owner = await prisma.user.findUnique({
        where: { email: updatePackageDto.ownerEmail },
      });

      if (!owner) {
        owner = await prisma.user.create({
          data: {
            email: updatePackageDto.ownerEmail,
            role: 'USER',
            permissions: [],
            name: updatePackageDto.ownerEmail.split('@')[0],
          },
        });
      }

      packageData.ownerId = owner.id;
    }

    const routeData: Record<string, unknown> = {};

    if (updatePackageDto.route) {
      if ((updatePackageDto.route as any).origin !== undefined) {
        routeData.origin = (updatePackageDto.route as any).origin;
      }

      if ((updatePackageDto.route as any).destination !== undefined) {
        routeData.destination = (updatePackageDto.route as any).destination;
      }

      if ((updatePackageDto.route as any).distance !== undefined) {
        routeData.distance = Number((updatePackageDto.route as any).distance);
      }

      if ((updatePackageDto.route as any).points !== undefined) {
        let validatedPoints;

        try {
          validatedPoints = validateRoutePoints(
            (updatePackageDto.route as any).points,
          );
        } catch (err) {
          throw new BadRequestException(
            'Invalid route points: ' + (err as Error).message,
          );
        }

        routeData.points = validatedPoints as any;
        routeData.currentPoint = initialActivePointFromPoints(
          validatedPoints as any,
        ) as any;
      }
    }

    const delivery = (existing as any).deliveries || null;

    const updatedPackage = await prisma.$transaction(async (tx) => {
      const pkg =
        Object.keys(packageData).length > 0
          ? await tx.package.update({
              where: { id: normalizedId },
              data: packageData as any,
            })
          : existing;

      if (Object.keys(routeData).length > 0) {
        if (!delivery?.routes?.id) {
          throw new BadRequestException(
            'Cannot update route because delivery route does not exist',
          );
        }

        await tx.route.update({
          where: { id: delivery.routes.id },
          data: routeData as any,
        });
      }

      if (updatePackageDto.status !== undefined && delivery?.id) {
        await tx.delivery.update({
          where: { id: delivery.id },
          data: { status: updatePackageDto.status },
        });
      }

      return pkg;
    });

    const statusChanged =
      updatePackageDto.status !== undefined &&
      updatePackageDto.status !== existing.status;

    if (statusChanged) {
      const destinationFromUpdate =
        (updatePackageDto.route as any)?.destination ??
        (delivery?.routes?.destination as string | undefined) ??
        'Destination';
      const originFromUpdate =
        (updatePackageDto.route as any)?.origin ??
        (delivery?.routes?.origin as string | undefined) ??
        'Transit Route';

      const owner = await prisma.user.findUnique({
        where: { id: existing.ownerId },
      });
      const emailToNotify = updatePackageDto.ownerEmail || owner?.email;
      if (emailToNotify) {
        await this.emailService.sendOrderStatusEmail({
          status: updatePackageDto.status as PackageStatus,
          orderId: String(updatedPackage.id).toUpperCase(),
          customerEmail: emailToNotify,
          customerName: owner?.name || undefined,
          destination: destinationFromUpdate,
          currentLocation: originFromUpdate,
        });
      } else {
        logger.warn('Skipping status email: owner email missing', {
          packageId: String(updatedPackage.id),
          ownerId: existing.ownerId,
          status: updatePackageDto.status,
        });
      }
    }

    return {
      ...updatedPackage,
      id: String(updatedPackage.id).toUpperCase(),
    };
  }

  remove(id: number) {
    return `This action removes a #${id} package`;
  }
}
