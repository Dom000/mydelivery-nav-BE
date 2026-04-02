import { Injectable, NotFoundException } from '@nestjs/common';
import prisma from '../prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

type UpdateUserProfileInput = {
  name?: string;
};

type ShippingAddressInput = {
  id?: string;
  label: string;
  address: string;
  default: boolean;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone1: string;
  phone2?: string | null;
};

@Injectable()
export class UserService {
  create(createUserDto: CreateUserDto) {
    return 'This action adds a new user';
  }

  findAll() {
    return `This action returns all user`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        shippingAddresses: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      shippingAddresses: user.shippingAddresses,
    };
  }

  async getPackages(userId: string) {
    const packages = await prisma.package.findMany({
      where: { ownerId: userId },
      include: {
        deliveries: {
          include: {
            routes: true,
            driver: true,
          },
        },
        owner: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return packages.map((pkg) => ({
      id: pkg.id,
      name: pkg.name,
      content: pkg.content,
      weight: pkg.weight,
      images: pkg.images,
      description: pkg.description,
      status: pkg.status,
      createdAt: pkg.createdAt,
      updatedAt: pkg.updatedAt,
      delivery: pkg.deliveries
        ? {
            id: pkg.deliveries.id,
            status: pkg.deliveries.status,
            route: pkg.deliveries.routes
              ? {
                  id: pkg.deliveries.routes.id,
                  origin: pkg.deliveries.routes.origin,
                  destination: pkg.deliveries.routes.destination,
                  distance: pkg.deliveries.routes.distance,
                  points: pkg.deliveries.routes.points,
                  currentPoint: pkg.deliveries.routes.currentPoint,
                }
              : null,
            driver: pkg.deliveries.driver
              ? {
                  id: pkg.deliveries.driver.id,
                  name: pkg.deliveries.driver.name,
                  email: pkg.deliveries.driver.email,
                }
              : null,
          }
        : null,
    }));
  }

  async getDeliveries(userId: string) {
    const deliveries = await prisma.delivery.findMany({
      where: {
        package: {
          ownerId: userId,
        },
      },
      include: {
        package: { include: { owner: true } },
        routes: true,
        driver: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return deliveries.map((delivery) => ({
      id: delivery.id,
      status: delivery.status,
      package: delivery.package
        ? {
            id: delivery.package.id,
            name: delivery.package.name,
            weight: delivery.package.weight,
            content: delivery.package.content,
            destination: delivery.routes?.destination ?? null,
            owner: delivery.package.owner
              ? {
                  id: delivery.package.owner.id,
                  name: delivery.package.owner.name,
                  email: delivery.package.owner.email,
                }
              : null,
          }
        : null,
      route: delivery.routes
        ? {
            id: delivery.routes.id,
            origin: delivery.routes.origin,
            destination: delivery.routes.destination,
            distance: delivery.routes.distance,
            points: delivery.routes.points,
            currentPoint: delivery.routes.currentPoint,
          }
        : null,
      driver: delivery.driver
        ? {
            id: delivery.driver.id,
            name: delivery.driver.name,
            email: delivery.driver.email,
          }
        : null,
      createdAt: delivery.createdAt,
      updatedAt: delivery.updatedAt,
    }));
  }

  async getShippingAddresses(userId: string) {
    const addresses = await prisma.shippingAddress.findMany({
      where: { userId },
      orderBy: [{ default: 'desc' }, { updatedAt: 'desc' }],
    });

    return addresses;
  }

  async updateProfile(userId: string, input: UpdateUserProfileInput) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name: input.name?.trim() || user.name || user.email.split('@')[0],
      },
      include: {
        shippingAddresses: true,
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      permissions: updated.permissions,
      shippingAddresses: updated.shippingAddresses,
    };
  }

  async saveShippingAddress(userId: string, input: ShippingAddressInput) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (input.default) {
      await prisma.shippingAddress.updateMany({
        where: { userId },
        data: { default: false },
      });
    }

    const data = {
      userId,
      label: input.label,
      address: input.address,
      default: input.default,
      city: input.city,
      state: input.state,
      zip: input.zip,
      country: input.country,
      phone1: input.phone1,
      phone2: input.phone2 || null,
    };

    if (input.id) {
      return prisma.shippingAddress.update({
        where: { id: input.id },
        data,
      });
    }

    return prisma.shippingAddress.create({ data });
  }
}
