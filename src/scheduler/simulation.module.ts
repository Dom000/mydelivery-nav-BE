import { Module } from '@nestjs/common';
import { SimulationService } from './simulation.service';

@Module({
  providers: [SimulationService],
})
export class SimulationModule {}
