import { DatabaseService, replaceAll } from './base';

const DEFAULT_QUERY_LIMIT = 1000;

const scanTablesQuery = `
SELECT
  TABLE_SCHEMA AS "schemaName",
  TABLE_NAME AS "name",
  OBJECT_DEFINITION(OBJECT_ID) AS "description"
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
AND TABLE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA')
`;

const scanTablesColumnsQuery = `
SELECT
  TABLE_SCHEMA AS "schemaName",
  TABLE_NAME AS "tableName",
  COLUMN_NAME AS "columnName",
  DATA_TYPE AS "dataType",
  CHARACTER_MAXIMUM_LENGTH AS "maxLength",
  IS_NULLABLE AS "isNullable",
  COLUMN_DEFAULT AS "defaultValue",
  COLUMNPROPERTY(OBJECT_ID(TABLE_NAME), COLUMN_NAME, 'IsIdentity') AS "isIdentity"
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA')
`;

const scanTablesRelationsQuery = `
SELECT
  f.name AS ForeignKey,
  OBJECT_NAME(f.parent_object_id) AS TableName,
  COL_NAME(fc.parent_object_id, fc.parent_column_id) AS ColumnName,
  OBJECT_NAME (f.referenced_object_id) AS ReferenceTableName,
  COL_NAME(fc.referenced_object_id, fc.referenced_column_id) AS ReferenceColumnName
FROM sys.foreign_keys AS f
INNER JOIN sys.foreign_key_columns AS fc
ON f.OBJECT_ID = fc.constraint_object_id
`;

const scanColumnRandomExampleQuery = (table: string, column: string) => {
  return `
    SELECT TOP 3 "${column}" AS value
    FROM (
      SELECT DISTINCT "${column}"
      FROM "${table}"
    ) AS foo
    ORDER BY NEWID();
  `;
};

const scanColumnClosedExamplesQuery = (
  table: string,
  column: string,
  value: string,
) => {
  // TODO: escape value
  return `
    SELECT TOP 10 "${column}" AS value
    FROM (
      SELECT DISTINCT "${column}"
      FROM "${table}"
    ) AS foo
    WHERE SOUNDEX("${column}") = SOUNDEX('${value}')
    ORDER BY "${column}"
  `;
};

export class SqlServerService extends DatabaseService {
  client: any;

  constructor(databaseConfig) {
    super();
    this.client = new databaseConfig.mssql.ConnectionPool(databaseConfig);
  }

  async runQuery(sqlQuery: string) {
    // TODO: add pagination (OFFSET 5 ROWS FETCH FIRST 5 ROW ONLY)
    sqlQuery = replaceAll(sqlQuery, '`', '"').trim().replace(/;$/, '');
    const sqlWrapper = `
      SELECT TOP ${DEFAULT_QUERY_LIMIT} *
      FROM (
        ${sqlQuery}
      ) AS foo
    `;

    const sqlCountWrapper = `
      SELECT COUNT(*)
      FROM (
        ${sqlQuery}
      ) AS foo
    `;

    const results = await this.client.request().query(sqlWrapper);
    let count = results.recordset.length;
    if (count == DEFAULT_QUERY_LIMIT) {
      const resCount = await this.client.request().query(sqlCountWrapper);
      count = resCount.recordset[0].count;
    }

    return {
      rows: results.recordset,
      count,
    };
  }

  async fetchClosedValues(table: string, column: string, value: string) {
    const results = await this.client.request().query(
      scanColumnClosedExamplesQuery(table, column, value),
    );
    return results.recordset.map((row) => row.value);
  }

  async scanTables() {
    const tablesRes = await this.client.request().query(scanTablesQuery);
    const tablesColumnsRes = await this.client.request().query(
      scanTablesColumnsQuery,
    );
    const tablesRelationsRes = await this.client.request().query(
      scanTablesRelationsQuery,
    );

    await Promise.all(
      tablesRes.recordset.map(async (table) => {
        table.columns = tablesColumnsRes.recordset.filter((colRow) => {
          return (
            colRow.tableName === table.name &&
            colRow.schemaName === table.schemaName
          );
        });
        await Promise.all(
          table.columns.map(async (column) => {
            const results = await this.client.request().query(
              scanColumnRandomExampleQuery(table.name, column.columnName),
            );
            column.examples = results.recordset.map((row) =>
              String(row.value).slice(0, 100),
            );

            const relation = tablesRelationsRes.recordset.find((relation) => {
              return (
                relation.tableName == column.tableName &&
                relation.columnName == column.columnName
              );
            });

            if (relation) {
              column.foreignTable = relation.referenceTableName;
              column.foreignColumn = relation.referenceColumnName;
            }
          }),
        );
      }),
    );
    return tablesRes.recordset;
  }
}