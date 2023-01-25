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
import { Table } from 'src/tables/tables.entity';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

interface TableSelected {
  schemaName: string;
  name: string;
}

@Injectable()
export class OpenAIModel {
  modelName = 'code-davinci-002'; // 'davinci:ft-personal-2022-08-30-11-19-42';
  openai: OpenAIApi;
  dbClient: PostgresService; // DatabaseService

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

  async openConnection(databaseId: number) {
    const database = await this.databasesService.findOne(databaseId);
    this.logger.debug('Create connection %o', database.id);
    this.dbClient = new PostgresService();
    this.dbClient.connect(database.details);
  }

  async closeConnection() {
    this.logger.debug('Close connection');
    await this.dbClient.client.end();
  }

  async _call(
    query: Query,
    modelName: string,
    prompt: string,
    parser: (output: string) => Promise<any>,
  ): Promise<any> {
    const cache = await this.queriesService.readPredictionCache({
      modelName,
      prompt,
    });

    if (cache) return cache;
    this.logger.debug('api call: %o', { id: query.id, query: query.query });

    parser = parser || (async (output) => output);

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
          parsedOutput = await parser(output);
          break;
        } catch (e) {
          // Parsing error
          this.logger.error('Parsing error: %o', e);
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

  // Should probably save this in a cache
  async _extractConditionsValues(querySaved: Query, query: string) {
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
      const values = await this._call(
        querySaved,
        'text-davinci-002',
        prompt,
        parser,
      );
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

    /* Parser func
     * Json parse
     * Check that the table are in the list of tables
     * If ok, return the tables
     * If not, throw an error
     */

    const parser = (output) => {
      const tablesSelected = JSON.parse(output.trim());
      const tablesSelectedNames = tablesSelected.map(
        (table) => table.schemaName + '.' + table.name,
      );
      const tablesNames = tables.map(
        (table) => table.schemaName + '.' + table.name,
      );
      if (_.difference(tablesSelectedNames, tablesNames).length > 0) {
        throw new Error('selectTables: Invalid tables selected.');
      }
      return tablesSelected;
    };

    try {
      tablesSelected = await this._call(
        querySaved,
        'text-davinci-002',
        prompt,
        parser,
      );
      return _.intersectionWith(tables, tablesSelected, _.isMatch);
    } catch (err) {
      this.logger.error('selectTables response', tablesSelected);
      throw err;
    }
  }

  async _findRelevantTables(
    querySaved: Query,
    databaseId: number,
    query: string,
    schemaName: string,
    tableName: string,
  ): Promise<any[]> {
    let tables = await this.tablesService.getDatabaseSchema(databaseId);

    // (Optional) Filter if we have schema && table
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
      tables = await this.selectTables(tables, querySaved, databaseId, query);
    }
    this.logger.debug('tables selected %s', tables);
    return tables;
  }

  async _fetchDatabaseContent(
    tables: any[],
    values: string[], // values to look for
  ): Promise<any[]> {
    await Promise.all(
      tables.map(async (table) => {
        await Promise.all(
          table.columns.map(async (column) => {
            if (!['text', 'character varying'].includes(column.dataType)) {
              return table;
            }
            this.logger.debug(
              'Fetch closeValues %s.%s',
              table.name,
              column.name,
            );
            const closeValues = await this.dbClient
              .fetchClosedValues(
                table.name,
                column.name,
                values[0], // TODO: support multiple values
              )
              .catch((e) => {
                this.logger.error(e);
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

    // TODO: remove ?
    await sleep(50);
    return tables;
  }

  async _prepareQueryExamples(
    databaseId: number,
    query: string,
  ): Promise<Query[]> {
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

    return queries;
  }

  async predict(querySaved: Query, params): Promise<string> {
    const { databaseId, query, schemaName, tableName } = params;
    // Open Database connection
    await this.openConnection(databaseId);

    // 1. Find the relevant tables
    let tables = await this._findRelevantTables(
      querySaved,
      databaseId,
      query,
      schemaName,
      tableName,
    );

    // 2. Find if the query contains entity to look for
    const values = await this._extractConditionsValues(querySaved, query);

    // 2b. If we have values, we fetch the database content
    if (values) {
      tables = await this._fetchDatabaseContent(tables, values);
    }

    // 3. Add query examples for few-shots prediction
    const queries = await this._prepareQueryExamples(databaseId, query);

    // 4. Prepare the query prompt
    const schemaYaml = yaml.dump(tables);
    const promptTemplate = fs.readFileSync(
      path.resolve(__dirname, './openai.default.ejs'),
      {
        encoding: 'utf8',
      },
    );

    /* Parser func
     * Check that the output has correct SQL syntax
     * Then run the query using limit 1 to validate the query against the database
     */
    const parser = async (output) => {
      await this.dbClient.runQueryWithLimit1(output);
      return output;
    };

    const prompt = ejs.render(promptTemplate, {
      schemaYaml,
      query,
      queries,
    });
    const modelName = params.model || this.modelName;
    const sqlQuery = await this._call(querySaved, modelName, prompt, parser);

    await this.closeConnection();

    return sqlQuery;
  }
}
