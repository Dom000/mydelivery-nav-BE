import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PackageModule } from './package/package.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { SimulationModule } from './scheduler/simulation.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PackageModule,
    UserModule,
    AuthModule,
    SimulationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
