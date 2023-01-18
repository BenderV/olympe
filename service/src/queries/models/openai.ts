import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueriesService } from '../queries.service';
import { Configuration, OpenAIApi } from 'openai';
import { TablesService } from '../../tables/tables.service';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as ejs from 'ejs';
import * as fs from 'fs';
import { DatabasesService } from '../../databases/databases.service';
import { PostgresService } from '../../databases/implementations/postgresql';
import * as _ from 'lodash';
import { Query } from '../queries.entity';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

interface TableSelected {
  schemaName: string;
  name: string;
}
@Injectable()
export class OpenAIModel {
  modelName = 'code-davinci-002'; // 'davinci:ft-personal-2022-08-30-11-19-42';
  openai = null;

  public readonly logger = new Logger('openAI');

  constructor(
    public queriesService: QueriesService,
    public databasesService: DatabasesService,
    public configService: ConfigService,
    public tablesService: TablesService,
  ) {
    const configuration = new Configuration({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
    this.openai = new OpenAIApi(configuration);
  }

  // Shoulld probably save this in a cache
  async extractConditionsValues(querySaved: Query, query: string) {
    const promptTemplate = fs.readFileSync(
      path.resolve(__dirname, './openai.where.ejs'),
      {
        encoding: 'utf8',
      },
    );
    const prompt = ejs.render(promptTemplate, {
      query,
    });

    // "["red", "green"]" => ["red", "green"]
    const parser = (output) => {
      return JSON.parse(output.trim());
    };
    try {
      const values = await this.call(
        querySaved,
        'text-davinci-002',
        prompt,
        parser,
      ); // simplest model...
      return values;
    } catch (e) {
      console.error('extractConditionsValues', e);
      throw new HttpException(
        'Could not extract values from the WHERE clause',
        500,
      );
    }
  }

  async selectTables(tables, querySaved, databaseId: number, query: string) {
    const promptTemplate = fs.readFileSync(
      path.resolve(__dirname, './openai.select_tables.ejs'),
      {
        encoding: 'utf8',
      },
    );
    const prompt = ejs.render(promptTemplate, {
      tables,
      query,
    });

    // [{
    //   schemaName: string;
    //   name: string;
    // }]
    let tablesSelected: TableSelected[];
    try {
      tablesSelected = await this.call(
        querySaved,
        'text-davinci-002',
        prompt,
        JSON.parse, //
      ); // simplest model...
      return _.intersectionWith(tables, tablesSelected, _.isMatch);
    } catch (err) {
      console.error('selectTables response', tablesSelected);
      throw new Error('selectTables: JSON Parsing Error.');
    }
  }

  async preparePrompt(
    querySaved: Query,
    databaseId: number,
    query: string,
    schemaName: string,
    tableName: string,
  ): Promise<string> {
    let tables = await this.tablesService.getDatabaseSchema(databaseId);

    // Filter if we have schema && table
    if (schemaName && tableName) {
      tables = tables.filter((table) => {
        return table.name === tableName && table.schemaName === schemaName;
      });
    }

    // If more than 3 tables or more then 30 columns in total
    if (
      tables.length > 3 ||
      _(tables).map('columns').flatten().value.length > 30
    ) {
      // @ts-ignore
      tables = await this.selectTables(tables, querySaved, databaseId, query);
    }
    this.logger.debug('tables selected %s', tables);

    const database = await this.databasesService.findOne(databaseId);

    const values = await this.extractConditionsValues(querySaved, query);

    if (values && values.length > 0) {
      console.log(querySaved.id, 'Create connection');
      const client = new PostgresService();
      await client.connect(database.details);
      this.logger.debug('values to search: %o', values);

      await Promise.all(
        tables.map(async (table) => {
          await Promise.all(
            table.columns.map(async (column) => {
              if (!['text', 'character varying'].includes(column.dataType)) {
                return table;
              }
              // TODO add log
              console.log(querySaved.id, 'Fetch closeValues');
              const closeValues = await client
                .fetchClosedValues(
                  table.name,
                  column.name,
                  values[0], // TODO: support multiple values
                )
                .catch((e) => {
                  console.error(e);
                  return [];
                });

              this.logger.debug('closeValues %o', closeValues);
              // We add to example...
              // Be careful as the examples given to openai is the first one with proximity

              column.examples = _.uniq(
                column.examples.concat(closeValues).map((value) => {
                  return _.truncate(value, { length: 50 });
                }),
              );
            }),
          );
        }),
      );

      await sleep(50);
      // Close connection
      client.client.end();
    }

    const schemaYaml = yaml.dump(tables);
    let queries =
      await this.queriesService.getValidatedQueriesExamplesOnDatabase(
        databaseId,
        query,
      );

    if (queries.length === 0) {
      // If there is no example, we prefill with stupid examples...
      queries = [
        {
          query: 'return 1',
          validatedSQL: 'SELECT 1;',
        },
        {
          query: "show the text 'lorem'",
          validatedSQL: "SELECT 'lorem';",
        },
      ] as Query[];
    }

    const promptTemplate = fs.readFileSync(
      path.resolve(__dirname, './openai.default.ejs'),
      {
        encoding: 'utf8',
      },
    );

    const prompt = ejs.render(promptTemplate, {
      schemaYaml,
      query,
      queries,
    });
    return prompt;
  }

  async call(query: Query, modelName, prompt, parser): Promise<any> {
    const cache = await this.queriesService.readPredictionCache({
      modelName,
      prompt,
    });

    if (cache) return cache;
    this.logger.debug('api call: %s', { id: query.id, query: query.query });

    parser = parser || ((output) => output);

    // Try at least 3 times
    const RETRY_COUNT = 3;
    let parsedOutput = null;
    let response;
    let output;
    try {
      for (let i = 0; i < RETRY_COUNT; i++) {
        response = await this.openai.createCompletion(
          modelName,
          {
            prompt,
            temperature: 0.7,
            max_tokens: 256,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
            stop: ['---'],
          },
          { timeout: 20000 },
        );
        output = response.data.choices[0].text;

        try {
          parsedOutput = parser(output);
          break;
        } catch (e) {
          // Parsing error
          console.error('Parsing error', e);
        }
      }

      this.queriesService.writePredictionCache({
        openAIResponse: response.data,
        query,
        modelName,
        prompt,
        output,
        value: parsedOutput,
      });
      return parsedOutput;
    } catch (err) {
      console.error(err.response.data);
      throw new Error('OpenAI API Error.');
    }
  }

  async predict(query: Query, params) {
    const prompt = await this.preparePrompt(
      query,
      params.databaseId,
      params.query,
      params.schemaName,
      params.tableName,
    );
    const modelName = params.model || this.modelName;
    return await this.call(query, modelName, prompt, null);
  }
}
