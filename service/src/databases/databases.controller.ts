import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { TablesService } from '../tables/tables.service';
import { Database } from './databases.entity';
import { DatabasesService } from './databases.service';
import * as _ from 'lodash';
import { Request } from 'express';

@Controller('databases')
export class DatabasesController {
  constructor(
    private readonly databasesService: DatabasesService,
    private readonly tablesService: TablesService,
  ) {}

  @Get()
  async getDatabases(@Req() request: Request) {
    // @ts-ignore
    const organisations = request.user?.userToOrganisations.map(
      (org) => org.organisationId,
    );
    return this.databasesService.fetchUserDatabases(
      // @ts-ignore
      request.user.id,
      organisations,
    );
  }

  @Post()
  async createDatabase(@Req() request: Request, @Body() database: Database) {
    // @ts-ignore
    database.ownerId = request.user.id;
    await this.databasesService._scanDatabase(database.details);
    return this.databasesService.create(database);
  }

  @Put(':id')
  async updateDatabase(@Param('id') id: number, @Body() database: Database) {
    await this.databasesService._scanDatabase(database.details);
    return this.databasesService.update(id, database);
  }

  @Delete(':id')
  deleteDatabase(@Param('id') id: number) {
    return this.databasesService.delete(id);
  }

  @Get(':id/_scan')
  async scanDatabase(@Param('id') id: number) {
    return await this.databasesService.scanDatabase(id);
  }

  @Get(':id/schema')
  async getDatabaseSchema(@Param('id') id: number) {
    return await this.tablesService.getDatabaseSchema(id);
  }

  // For testing purpose
  @Post('/_playground')
  async createPlayground(@Req() request: Request) {
    await this.databasesService.createUserPlaygroundDatabase(
      request.params.name,
      // @ts-ignore
      request.user,
    );
  }
}
