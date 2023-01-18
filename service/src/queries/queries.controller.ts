import {
  Body,
  Controller,
  Param,
  Post,
  Get,
  HttpException,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { DatabasesService } from '../databases/databases.service';
import { PostgresService } from '../databases/implementations/postgresql';
import { Configuration, OpenAIApi } from 'openai';
import { QueriesService } from './queries.service';
import { ConfigService } from '@nestjs/config';
import { OpenAIModel, OpenAITrainedModel } from './models/openai';

type SQLRequesParams = {
  query: string;
};

interface Dictionary<T> {
  [Key: string]: T;
}

type defaultParams = {
  query: string;
  databaseId: number;
  tableId: number;
  tables: Dictionary<number>;
};

type translateParams = {
  databaseId: number;
  query: string;
  model?: string;
};

export class SQLErrorException extends HttpException {
  constructor(response) {
    // TODO: remove this ?
    if (response.code === '42P01') {
      response.error_type = 'SQLErrorRelationNotFound';
    } else if (response.code === '42601') {
      response.error_type = 'SQLErrorSyntax';
    } else if (response.code === '42703') {
      response.error_type = 'SQLErrorColumnNotFound';
    } else {
      response.error_type = 'SQLError';
    }
    super(response, HttpStatus.BAD_REQUEST);
  }
}

@Controller('query')
export class QueryController {
  openai = null;

  constructor(
    private readonly databasesService: DatabasesService,
    private queriesService: QueriesService,
    private configService: ConfigService,
    private openAIModel: OpenAIModel,
    private openAITrainedModel: OpenAITrainedModel,
  ) {
    const configuration = new Configuration({
      apiKey: configService.get<string>('OPENAI_API_KEY'),
    });
    this.openai = new OpenAIApi(configuration);
  }

  @Get('/')
  async getQueries() {
    return await this.queriesService.find();
  }

  @Get('/:id')
  async getQuery(@Param('id') id: number) {
    return await this.queriesService.findOne(id);
  }

  @Post('/translate')
  async translate(@Req() request, @Body() params: translateParams) {
    let querySaved = await await this.queriesService.findByQuery(
      params.databaseId,
      params.query,
    );
    if (!querySaved) {
      querySaved = await this.queriesService.create({
        databaseId: params.databaseId,
        query: params.query,
        creator: request.user,
      });
    }

    try {
      let output;
      if (params.model && params.model.indexOf(':') !== -1) {
        output = await this.openAITrainedModel.predict(querySaved, params);
      } else {
        output = await this.openAIModel.predict(querySaved, params);
      }
      return {
        id: querySaved.id,
        output: output,
      };
    } catch (e) {
      console.error(e);
      throw new HttpException(
        {
          id: querySaved.id,
        },
        400,
      );
    }
  }

  @Post('/_run')
  async runQuery(@Body() params: translateParams) {
    const database = await this.databasesService.findOne(params.databaseId);
    const conn = new PostgresService();
    await conn.connect(database.details);
    try {
      return await conn.runQuery(params.query);
    } catch (e) {
      throw new SQLErrorException({ message: e.message, code: e.code });
    } finally {
      conn.client.end();
    }
  }

  @Post('/:id/validate')
  async validateQuery(@Param('id') id: number, @Body() body: SQLRequesParams) {
    return this.queriesService.validate(id, body.query);
  }
}
