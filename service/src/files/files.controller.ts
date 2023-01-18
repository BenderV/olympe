import {
  Controller,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { Request } from 'express';
import axios from 'axios';
import * as FormData from 'form-data';
import * as _ from 'lodash';
import { DatabasesService } from '../databases/databases.service';
import { Database } from '../databases/databases.entity';

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

@Controller('files')
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly databasesService: DatabasesService,
  ) {}

  @Post('/_upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile()
    file: Express.Multer.File,

    @Req() request: Request,
  ) {
    await this.filesService.save(file);

    const database = await this.databasesService.createUserPlaygroundDatabase(
      file.originalname, // We use filename as datasource name
      // @ts-ignore
      request.user,
    );
    const result = await this.importFileToDatabase(database, file);
    await this.databasesService.scanDatabase(database.id);
    return result.data;
  }

  async importFileToDatabase(database: Database, file: Express.Multer.File) {
    const formData = new FormData();
    formData.append('file', Buffer.from(file.buffer), file.originalname);
    const url = process.env.DATA_SERVICE_URL + '/upload';
    return await axios.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      params: {
        database: database.details.database,
        user: database.details.user,
        password: database.details?.password,
      },
    });
  }
}
