import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueryController } from './queries.controller';
import { Prediction, Query } from './queries.entity';

import { QueriesService } from './queries.service';
import { ConfigService } from '@nestjs/config';
import { OpenAIModel, OpenAITrainedModel } from './models/openai';
import { DatabasesModule } from '../databases/databases.module';
import { TablesModule } from '../tables/tables.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Query, Prediction]),
    DatabasesModule,
    TablesModule,
  ],
  providers: [QueriesService, ConfigService, OpenAIModel, OpenAITrainedModel],
  controllers: [QueryController],
})
export class QueryModule {}
