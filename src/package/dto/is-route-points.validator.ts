import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { RoutePointsSchema } from '../../types/schema';

@ValidatorConstraint({ async: false })
class RoutePointsConstraint implements ValidatorConstraintInterface {
  validate(value: any, _args: ValidationArguments) {
    const result = RoutePointsSchema.safeParse(value);
    return result.success;
  }

  defaultMessage(_args: ValidationArguments) {
    return 'points must be an array of { label, coords:[lat,lng], durationToNext? }';
  }
}

export function IsRoutePoints(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: RoutePointsConstraint,
    });
  };
}
