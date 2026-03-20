import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
  ValidationPipe,
} from '@nestjs/common';
import { LoginAdminDto } from './dto/login-admin.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Public } from './decorators/public.decorator';
import { Admin } from './decorators/admin.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  async login(
    @Body(new ValidationPipe({ transform: true })) dto: LoginAdminDto,
  ) {
    return this.authService.adminLogin(dto.email, dto.password);
  }

  @Post('send-otp')
  @Public()
  async sendOtp(
    @Body(new ValidationPipe({ transform: true })) dto: SendOtpDto,
  ) {
    return this.authService.sendOtp(dto.email);
  }

  @Post('resend-otp')
  @Public()
  async resendOtp(
    @Body(new ValidationPipe({ transform: true })) dto: ResendOtpDto,
  ) {
    return this.authService.resendOtp(dto.email);
  }

  @Post('verify-otp')
  @Public()
  async verifyOtp(
    @Body(new ValidationPipe({ transform: true })) dto: VerifyOtpDto,
  ) {
    return this.authService.verifyOtp(dto.email, dto.code);
  }

  // Protected: only admins may create admins
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Admin()
  @Post('create-admin')
  async createAdmin(
    @Body(new ValidationPipe({ transform: true })) dto: CreateAdminDto,
  ) {
    return this.authService.createAdmin(dto.email, dto.password);
  }

  // Bootstrap endpoint: create initial admin using a server secret
  @Public()
  @Post('bootstrap-admin')
  async bootstrapAdmin(
    @Body(new ValidationPipe({ transform: true })) dto: CreateAdminDto,
  ) {
    // const secret = process.env.ADMIN_CREATION_SECRET || '';
    // if (!dto.secret || dto.secret !== secret) {
    //   throw new BadRequestException('Invalid or missing admin creation secret');
    // }
    return this.authService.createAdmin(dto.email, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @Admin()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin-only')
  adminOnly(@Request() req) {
    return { ok: true, user: req.user };
  }
}
