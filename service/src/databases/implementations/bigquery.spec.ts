import { BigQueryService } from './bigquery';

describe('BigQueryService', () => {
  let bigQueryService: BigQueryService;
  let databaseConfig: object; // database config

  beforeEach(() => {
    bigQueryService = new BigQueryService();
    databaseConfig = {
      projectId: 'outliers-155223',
      keyFilename: '../.secrets/outliers-155223-d8079c756b27.json',
      database: 'bigquery-public-data.github_repos',
    };
  });

  describe('connect', () => {
    it('should connect to the database', () => {
      bigQueryService.connect(databaseConfig);
      expect(bigQueryService).toBeDefined();
    });
  });

  describe('runQuery', () => {
    it('should run a query on the database', async () => {
      await bigQueryService.connect(databaseConfig);
      const sqlQuery = `
        SELECT *
        FROM \`bigquery-public-data.github_repos.commits\`
        LIMIT 10
      `;
      const [rows] = await bigQueryService.runQuery(sqlQuery);
      expect(rows).toBeDefined();
    });
  });

  describe('fetchClosedValues', () => {
    it('should fetch closed values from a column', async () => {
      bigQueryService.connect(databaseConfig);
      const [rows] = await bigQueryService.fetchClosedValues(
        'bigquery-public-data.github_repos.commits',
        'author.name',
        'John',
      );
      expect(rows).toBeDefined();
      expect(rows).toHaveLength(5);
    });
  });

  describe('scanDatabase', () => {
    it('should scan the database and return a list of tables with their columns', async () => {
      bigQueryService.connect(databaseConfig);
      const tables = await bigQueryService.scanDatabase();
      expect(tables).toBeDefined();
      // TODO: fix typing one day
      // expect(tables).toHaveLength(5);
      // expect(tables[0]).toBeInstanceOf(Table);
      // expect(tables[0].columns).toHaveLength(5);
      // expect(tables[0].columns[0]).toBeInstanceOf(TableColumn);
    });
  });
});
