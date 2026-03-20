import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { EmailService } from '../email/email.service';

const prisma = new PrismaClient();

export interface AccessTokenPayload {
  id: string;
  iss: string;
  sub: string;
  aud: string[];
  exp?: number;
  iat?: number;
  azp: string;
  scope: string;
  roles?: string[];
  permissions: string[];
  [key: string]: any;
}

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  // Validate against DB using Prisma. If `password` field exists on the user record, verify using bcrypt.
  async validateUser(username: string, password: string) {
    // Adjust the `where` filter to match your DB fields (e.g., `email` instead of `name`)
    const user = await prisma.user.findFirst({ where: { name: username } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials: user not found');
    }

    // If the DB record stores a password hash, verify it. Otherwise accept.
    // This keeps compatibility with minimal demo schema.
    // @ts-ignore
    if (user.password) {
      // @ts-ignore
      const match = await bcrypt.compare(password, user.password);
      if (!match)
        throw new UnauthorizedException(
          'Invalid credentials: incorrect password',
        );
    }

    return user;
  }

  // Delegate OTP sending to EmailService
  async sendOtp(email: string) {
    return this.emailService.sendOtpToEmail(email);
  }

  // Resend delegates to EmailService as well
  async resendOtp(email: string) {
    return this.emailService.sendOtpToEmail(email);
  }

  // Verify OTP and return auth token (creates user if missing in send step didn't)
  async verifyOtp(email: string, code: string) {
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // @ts-ignore
    if (!user.otp || !user.otpExpires)
      throw new UnauthorizedException('No OTP found; request a new code');

    const now = new Date();
    // @ts-ignore
    if (user.otp !== code || user.otpExpires < now)
      throw new UnauthorizedException('Invalid or expired OTP');

    // clear otp
    await prisma.user.update({
      where: { id: user.id },
      data: { otp: null, otpExpires: null },
    });

    // Return signed token
    return this.login(user);
  }

  async login(user: any) {
    const payload: AccessTokenPayload = {
      id: user.id,
      iss: process.env.JWT_ISSUER || 'mydelivery',
      sub: user.id,
      aud: [process.env.JWT_AUDIENCE || 'mydelivery'],
      azp: process.env.JWT_AZP || 'mydelivery-app',
      scope: 'default',
      roles: user.role ? [user.role] : [],
      permissions: user.permissions || [],
    };

    return { access_token: this.jwtService.sign(payload) };
  }

  async adminLogin(email: string, password: string) {
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // @ts-ignore
    if (!user.password)
      throw new UnauthorizedException('No password set for this user');

    // @ts-ignore
    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new UnauthorizedException('Invalid credentials');

    if (user.role !== 'admin') throw new UnauthorizedException('Not an admin');

    return this.login(user);
  }
}
