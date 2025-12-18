import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'your-secret-key',
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.sub,
      username: payload.username,
      roles: payload.roles,
      permissions: payload.permissions,
      // ========================================================================
      // NEW CHANGES FOR OFFBOARDING: Extract employeeNumber from JWT payload
      // Required for OFF-018 (Employee Resignation) and OFF-001 (HR Termination)
      // This makes employeeNumber available on req.user in controllers/services
      // ========================================================================
      employeeNumber: payload.employeeNumber,
    };
  }
}
