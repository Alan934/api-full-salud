/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { envConfig } from '../../../config/envs';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: envConfig.JWT_SECRET
      });

      request['profile'] = payload;
      request['token'] = token; // Guardar el token en la solicitud
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

// Alias para mantener la compatibilidad hacia atrás
export const AuthGuard = JwtAuthGuard;

export function Roles(...roles: string[]) {
  return (target: object, key?: any, descriptor?: any) => {
    Reflect.defineMetadata('roles', roles, descriptor?.value ?? target);
  };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    // private reflector: Reflector,
    // private jwtAuthGuard: JwtAuthGuard
    private readonly reflector: Reflector,
    private readonly jwtAuthGuard: JwtAuthGuard // Inyecta JwtAuthGuard
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Primero verifica que el token sea válido
    const isAuthenticated = await this.jwtAuthGuard.canActivate(context);
    if (!isAuthenticated) {
      return false;
    }

    // Obtener los roles requeridos
    const roles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass()
    ]);

    if (!roles) {
      return true; // Si no hay roles definidos, permitir acceso
    }

    const request = context.switchToHttp().getRequest();
    const userRole = request['profile']?.role;

    if (!userRole) {
      throw new ForbiddenException('User role not found');
    }

    if (!roles.includes(userRole)) {
      throw new ForbiddenException('Access denied: insufficient role');
    }

    return true;
  }
}
