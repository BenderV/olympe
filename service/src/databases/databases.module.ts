import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabasesService } from './databases.service';
import { DatabasesController } from './databases.controller';
import { Database } from './databases.entity';
import { TablesModule } from '../tables/tables.module';

@Module({
  imports: [TypeOrmModule.forFeature([Database]), TablesModule],
  providers: [DatabasesService],
  controllers: [DatabasesController],
  exports: [DatabasesService],
})
export class DatabasesModule {}
