import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TableColumn, Table } from './tables.entity';
import { TablesService } from './tables.service';
// import { TablesController } from './tables.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Table, TableColumn])],
  providers: [TablesService],
  exports: [TablesService],
})
export class TablesModule {}
