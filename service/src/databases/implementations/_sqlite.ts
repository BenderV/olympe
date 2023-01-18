import { DatabaseService, replaceAll } from './base';
import { Database } from 'sqlite3';

const DEFAULT_QUERY_LIMIT = 1000;

const scanTablesQuery = `
    SELECT
      "name" AS "name",
      "sql" AS "description"
    FROM "sqlite_master"
    WHERE "type" = 'table';
`;

const scanTablesColumnsQuery = `
    SELECT
      "name" AS "name",
      "type" AS "type",
      "pk" AS "isIdentity"
    FROM "PRAGMA_TABLE_INFO"
    WHERE "tbl_name" = ?;
`;

const scanTablesRelationsQuery = `
    SELECT
      "from" AS "tableName",
      "from_column" AS "columnName",
      "table" AS "foreignTable",
      "to_column" AS "foreignColumn"
    FROM "PRAGMA_FOREIGN_KEY_LIST"
    WHERE "from" = ?;
`;

const scanColumnRandomExampleQuery = (table: string, column: string) => {
  return `
    SELECT "${column}" AS value
    FROM (
      SELECT DISTINCT "${column}"
      FROM "${table}"
    ) AS foo
    ORDER BY RANDOM()
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
      SELECT  DISTINCT similarity('${value}', "${column}") AS similarity, "${column}" AS value
      FROM    "${table}"
      WHERE   similarity('${value}', "${column}") > 0.8
      LIMIT 10
    ) AS foo
    UNION 
    SELECT *
    FROM (
      SELECT  DISTINCT similarity('${value}', "${column}") AS similarity, "${column}" AS value
      FROM    "${table}"
      WHERE   similarity('${value}', "${column}") > 0.2
      ORDER BY similarity('${value}', "${column}") DESC
      LIMIT 3
    ) AS foo2
  `;
};

export class SqliteService extends DatabaseService {
  db: Database;

  constructor(databaseConfig) {
    super();
    this.db = new Database(databaseConfig.filename, (err) => {
      if (err) {
        console.error(err.message);
      }
    });
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

    const results = await new Promise((resolve, reject) => {
      this.db.all(sqlWrapper, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });

    let count = results.length;
    if (count == DEFAULT_QUERY_LIMIT) {
      const resCount = await new Promise((resolve, reject) => {
        this.db.all(sqlCountWrapper, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        });
      });
      count = resCount[0].count;
    }

    return {
      rows: results,
      count,
    };
  }

  async fetchClosedValues(table: string, column: string, value: string) {
    const results = await new Promise((resolve, reject) => {
      this.db.all(
        scanColumnClosedExamplesQuery(table, column, value),
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        },
      );
    });
    return results.map((row) => row.value);
  }

  async scanTables() {
    const tablesRes = await new Promise((resolve, reject) => {
      this.db.all(scanTablesQuery, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });

    await Promise.all(
      tablesRes.map(async (table) => {
        table.columns = await new Promise((resolve, reject) => {
          this.db.all(scanTablesColumnsQuery, table.name, (err, rows) => {
            if (err) {
              reject(err);
            } else {
              resolve(rows);
            }
          });
        });

        await Promise.all(
          table.columns.map(async (column) => {
            const results = await new Promise((resolve, reject) => {
              this.db.all(
                scanColumnRandomExampleQuery(table.name, column.name),
                (err, rows) => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve(rows);
                  }
                },
              );
            });
            column.examples = results.map((row) =>
              String(row.value).slice(0, 100),
            );

            const relations = await new Promise((resolve, reject) => {
              this.db.all(
                scanTablesRelationsQuery,
                table.name,
                (err, rows) => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve(rows);
                  }
                },
              );
            });

            const relation = relations.find((relation) => {
              return relation.columnName == column.name;
            });

            if (relation) {
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