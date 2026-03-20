import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requireAdmin = this.reflector.getAllAndOverride<boolean>('isAdmin', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requireAdmin) return true;
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return false;
    const role = (user.role || '').toString().toUpperCase();
    if (role === Role.ADMIN) return true;
    // also accept a roles array on the token payload
    if (Array.isArray(user.roles)) {
      return user.roles
        .map((r: any) => String(r).toUpperCase())
        .includes(Role.ADMIN);
    }
    return false;
  }
}
