import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { File } from './files.entity';
import { DatabasesModule } from '../databases/databases.module';

@Module({
  imports: [TypeOrmModule.forFeature([File]), DatabasesModule],
  providers: [FilesService],
  controllers: [FilesController],
})
export class FilesModules {}
