import { DatabaseService, replaceAll } from './base';
import { createConnection, Connection } from 'mysql';

const DEFAULT_QUERY_LIMIT = 1000;

const scanTablesQuery = `
  SELECT
    TABLE_SCHEMA AS "schemaName",
    TABLE_NAME AS "name",
    TABLE_COMMENT AS "description"
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA NOT IN ('information_schema', 'mysql');
`;

const scanTablesColumnsQuery = `
  SELECT
    TABLE_SCHEMA AS "schemaName",
    TABLE_NAME AS "tableName",
    COLUMN_NAME AS "columnName",
    DATA_TYPE AS "dataType",
    COLUMN_COMMENT AS "description",
    COLUMN_KEY AS "isIdentity"
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA NOT IN ('information_schema', 'mysql');
`;

const scanTablesRelationsQuery = `
  SELECT
    TABLE_SCHEMA,
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_SCHEMA AS "foreignTableSchema",
    REFERENCED_TABLE_NAME AS "foreignTable",
    REFERENCED_COLUMN_NAME AS "foreignColumn"
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE REFERENCED_TABLE_SCHEMA IS NOT NULL
`;

const scanColumnRandomExampleQuery = (table: string, column: string) => {
  return `
    SELECT "${column}" AS value
    FROM (
      SELECT DISTINCT "${column}"
      FROM "${table}"
    ) AS foo
    ORDER BY RAND()
    LIMIT 3;
  `;
};

const scanColumnClosedExamplesQuery = (
  table: string,
  column: string,
  value: string,
) => {
  // TODO: escape value
  return `
    SELECT *
    FROM (
      SELECT  DISTINCT SOUNDEX("${column}") AS soundex, "${column}" AS value
      FROM    "${table}"
      WHERE   SOUNDEX("${column}") = SOUNDEX('${value}')
      LIMIT 10
    ) AS foo
    UNION 
    SELECT *
    FROM (
      SELECT  DISTINCT SOUNDEX("${column}") AS soundex, "${column}" AS value
      FROM    "${table}"
      WHERE   SOUNDEX("${column}") = SOUNDEX('${value}')
      ORDER BY SOUNDEX("${column}") DESC
      LIMIT 3
    ) AS foo2
  `;
};

export class MysqlService extends DatabaseService {
  connection: Connection;

  constructor(databaseConfig) {
    super();
    this.connection = createConnection(databaseConfig);
  }

  async runQuery(sqlQuery: string) {
    // TODO: add pagination (OFFSET 5 ROWS FETCH FIRST 5 ROW ONLY)
    sqlQuery = replaceAll(sqlQuery, '`', '"').trim().replace(/;$/, '');
    const sqlWrapper = `
      SELECT *
      FROM (
        ${sqlQuery}
      ) AS foo
      LIMIT ${DEFAULT_QUERY_LIMIT};
    `;

    const sqlCountWrapper = `
      SELECT COUNT(*)
      FROM (
        ${sqlQuery}
      ) AS foo
    `;

    const [rows, countRes] = await Promise.all([
      new Promise((resolve, reject) => {
        this.connection.query(sqlWrapper, (error, results) => {
          if (error) {
            reject(error);
          } else {
            resolve(results);
          }
        });
      }),
      new Promise((resolve, reject) => {
        this.connection.query(sqlCountWrapper, (error, results) => {
          if (error) {
            reject(error);
          } else {
            resolve(results);
          }
        });
      }),
    ]);

    let count = rows.length;
    if (count == DEFAULT_QUERY_LIMIT) {
      count = countRes[0].count;
    }

    return {
      rows,
      count,
    };
  }

  async fetchClosedValues(table: string, column: string, value: string) {
    const results = await new Promise((resolve, reject) => {
      this.connection.query(
        scanColumnClosedExamplesQuery(table, column, value),
        (error, results) => {
          if (error) {
            reject(error);
          } else {
            resolve(results);
          }
        },
      );
    });
    return results.map((row) => row.value);
  }

  async scanTables() {
    const tablesRes = await new Promise((resolve, reject) => {
      this.connection.query(scanTablesQuery, (error, results) => {
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      });
    });
    const tablesColumnsRes = await new Promise((resolve, reject) => {
      this.connection.query(scanTablesColumnsQuery, (error, results) => {
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      });
    });
    const tablesRelationsRes = await new Promise((resolve, reject) => {
      this.connection.query(scanTablesRelationsQuery, (error, results) => {
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      });
    });

    await Promise.all(
      tablesRes.map(async (table) => {
        table.columns = tablesColumnsRes.filter((colRow) => {
          return (
            colRow.tableName === table.name &&
            colRow.schemaName === table.schemaName
          );
        });
        await Promise.all(
          table.columns.map(async (column) => {
            const results = await new Promise((resolve, reject) => {
              this.connection.query(
                scanColumnRandomExampleQuery(table.name, column.columnName),
                (error, results) => {
                  if (error) {
                    reject(error);
                  } else {
                    resolve(results);
                  }
                },
              );
            });
            column.examples = results.map((row) =>
              String(row.value).slice(0, 100),
            );

            const relation = tablesRelationsRes.find((relation) => {
              return (
                relation.table_schema == column.schemaName &&
                relation.table_name == column.tableName &&
                relation.column_name == column.columnName
              );
            });

            if (relation) {
              column.foreignTableSchema = relation.foreignTableSchema;
              column.foreignTable = relation.foreignTable;
              column.foreignColumn = relation.foreignColumn;
            }
          }),
        );
      }),
    );
    return tablesRes;
  }
}