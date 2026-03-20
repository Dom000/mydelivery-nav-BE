import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { PackageService } from './package.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { Admin } from 'src/auth/decorators/admin.decorator';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Public } from 'src/auth/decorators/public.decorator';

@Controller('package')
export class PackageController {
  constructor(private readonly packageService: PackageService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Admin()
  @Post()
  create(@Body() createPackageDto: CreatePackageDto) {
    return this.packageService.create(createPackageDto);
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
