// Made by OpenAI
// Implemented the 31/08/22

import { DatabaseService } from './base';
import { Table } from '../../tables/tables.entity';
import { BigQuery } from '@google-cloud/bigquery';

export class BigQueryService extends DatabaseService {
  private bigquery: BigQuery;
  private databaseName: string;

  constructor() {
    super();
    this.bigquery = new BigQuery();
  }

  connect(databaseConfig) {
    this.bigquery = new BigQuery({
      projectId: databaseConfig.projectId,
      keyFilename: databaseConfig.keyFilename,
    });
    this.databaseName = databaseConfig.database;
  }

  runQuery(sqlQuery: string) {
    return this.bigquery.query({
      query: sqlQuery,
      useLegacySql: false,
    });
  }

  fetchClosedValues(table: string, column: string, value: string) {
    const sqlQuery = `
      SELECT ${column}
      FROM ${table}
      WHERE ${column} LIKE '${value}%'
      GROUP BY ${column}
      ORDER BY COUNT(*) DESC
      LIMIT 5
    `;

    return this.runQuery(sqlQuery);
  }

  async scanDatabase(): Promise<Table[]> {
    const sqlQuery = `
        SELECT * 
        FROM \`${this.databaseName}\`.INFORMATION_SCHEMA.COLUMNS;
    `;

    const [rows] = await this.runQuery(sqlQuery);

    const tables = rows.reduce((acc, row) => {
      const table = acc.find(
        (t) =>
          t.databaseId === row.table_catalog &&
          t.schemaName === row.table_schema &&
          t.name === row.table_name,
      );

      if (!table) {
        acc.push({
          databaseId: row.table_catalog,
          schemaName: row.table_schema,
          name: row.table_name,
          columns: [
            {
              tableDatabaseId: row.table_catalog,
              tableSchemaName: row.table_schema,
              tableName: row.table_name,
              columnName: row.column_name,
              dataType: row.data_type,
              isIdentity: row.is_identity,
              description: row.description,
              foreignTableSchema: row.foreign_table_schema,
              foreignTable: row.foreign_table,
              foreignColumn: row.foreign_column,
            },
          ],
        });
      } else {
        table.columns.push({
          tableDatabaseId: row.table_catalog,
          tableSchemaName: row.table_schema,
          tableName: row.table_name,
          columnName: row.column_name,
          dataType: row.data_type,
          isIdentity: row.is_identity,
          description: row.description,
          foreignTableSchema: row.foreign_table_schema,
          foreignTable: row.foreign_table,
          foreignColumn: row.foreign_column,
        });
      }

      return acc;
    }, []);

    return tables;
  }
}
