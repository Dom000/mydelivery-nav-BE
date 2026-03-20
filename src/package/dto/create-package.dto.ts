import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ArrayNotEmpty,
  IsMongoId,
  ValidateNested,
  IsEnum,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateRouteDto } from './create-route.dto';

export enum PackageStatus {
  PENDING = 'PENDING',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  OBSTRUCTED = 'OBSTRUCTED',
}

export class CreatePackageDto {
  @IsString()
  name: string;

  @IsNumber()
  @Type(() => Number)
  weight: number;

  @IsString()
  content: string;

  @IsArray()
  @IsOptional()
  images?: string[];

  @IsEmail()
  ownerEmail: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(PackageStatus)
  status?: PackageStatus;

  @ValidateNested()
  @Type(() => CreateRouteDto)
  route: CreateRouteDto;
}
