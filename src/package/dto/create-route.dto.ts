import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { IsRoutePoints } from './is-route-points.validator';

export class CreateRouteDto {
  @IsString()
  origin: string;

  @IsString()
  destination: string;

  @IsRoutePoints()
  points: unknown;

  @IsNumber()
  @Type(() => Number)
  distance: number;
}
