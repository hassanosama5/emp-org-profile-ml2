import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { SystemRole } from '../../employee-profile/enums/employee-profile.enums';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<SystemRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      console.error('[RolesGuard] No user found in request');
      throw new ForbiddenException('Access denied: User not authenticated');
    }

    if (!user.roles || user.roles.length === 0) {
      console.error(`[RolesGuard] User ${user.sub || user._id} has no roles assigned`);
      throw new ForbiddenException(`Access denied: No roles assigned to user. Required roles: ${requiredRoles.join(', ')}`);
    }

    const hasRole = requiredRoles.some((role) => user.roles?.includes(role));
    
    if (!hasRole) {
      console.error(`[RolesGuard] User ${user.sub || user._id} with roles [${user.roles.join(', ')}] denied access. Required: [${requiredRoles.join(', ')}]`);
      throw new ForbiddenException(`Access denied: You need one of these roles: ${requiredRoles.join(', ')}. Your roles: ${user.roles.join(', ')}`);
    }

    return true;
  }
}
