import { Module } from '@nestjs/common';
import { PackageService } from './package.service';
import { PackageController } from './package.controller';
import { CloudinaryService } from './cloudinary.service';
import { EmailModule } from 'src/email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [PackageController],
  providers: [PackageService, CloudinaryService],
})
export class PackageModule {}
