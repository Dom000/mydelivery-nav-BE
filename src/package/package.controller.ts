import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PackageService } from './package.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { Admin } from 'src/auth/decorators/admin.decorator';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Public } from 'src/auth/decorators/public.decorator';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@Controller('package')
export class PackageController {
  constructor(private readonly packageService: PackageService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Admin()
  @Post()
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: memoryStorage(),
      limits: {
        fileSize: 8 * 1024 * 1024,
      },
      fileFilter: (_req, file, callback) => {
        const isImage = file.mimetype.startsWith('image/');
        if (!isImage) {
          callback(
            new BadRequestException('Only image files are allowed'),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  async create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: Record<string, unknown>,
  ) {
    let parsedRoute = body.route;

    if (typeof parsedRoute === 'string') {
      try {
        parsedRoute = JSON.parse(parsedRoute);
      } catch {
        throw new BadRequestException('route must be valid JSON');
      }
    }

    const normalizedImages = Array.isArray(body.images)
      ? body.images
      : typeof body.images === 'string'
        ? [body.images]
        : undefined;

    const createPackageDto = plainToInstance(CreatePackageDto, {
      ...body,
      weight: Number(body.weight),
      images: normalizedImages,
      route: parsedRoute,
    });

    const validationErrors = await validate(createPackageDto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (validationErrors.length > 0) {
      throw new BadRequestException(validationErrors);
    }

    return this.packageService.create(createPackageDto, files ?? []);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Admin()
  @Get()
  findAll() {
    return this.packageService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Admin()
  @Get('deliveries')
  findAllPackageDeliveries() {
    return this.packageService.findAllDeliveries();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') packageId: string) {
    const id = (packageId || '').toLowerCase();
    return this.packageService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Admin()
  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePackageDto: UpdatePackageDto) {
    return this.packageService.update(+id, updatePackageDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Admin()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.packageService.remove(+id);
  }
}
