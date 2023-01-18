import { DatabaseService, replaceAll } from './base';

const DEFAULT_QUERY_LIMIT = 1000;

const scanTablesQuery = `
SELECT
  table_catalog AS "catalog",
  table_schema AS "schemaName",
  table_name AS "name",
  table_type AS "type"
FROM information_schema.tables
WHERE table_schema NOT IN ('information_schema', 'pg_catalog');
`;

const scanTablesColumnsQuery = `
SELECT
  table_catalog AS "catalog",
  table_schema AS "schemaName",
  table_name AS "tableName",
  column_name AS "columnName",
  data_type AS "dataType",
  is_nullable,
  column_default AS "defaultValue",
  ordinal_position AS "position",
  character_maximum_length AS "maxLength",
  numeric_precision AS "numericPrecision",
  numeric_precision_radix AS "numericPrecisionRadix",
  numeric_scale AS "numericScale",
  datetime_precision AS "datetimePrecision",
  interval_type AS "intervalType",
  interval_precision AS "intervalPrecision",
  character_set_catalog AS "characterSetCatalog",
  character_set_schema AS "characterSetSchema",
  character_set_name AS "characterSetName",
  collation_catalog AS "collationCatalog",
  collation_schema AS "collationSchema",
  collation_name AS "collationName",
  domain_catalog AS "domainCatalog",
  domain_schema AS "domainSchema",
  domain_name AS "domainName",
  udt_catalog AS "udtCatalog",
  udt_schema AS "udtSchema",
  udt_name AS "udtName",
  scope_catalog AS "scopeCatalog",
  scope_schema AS "scopeSchema",
  scope_name AS "scopeName",
  maximum_cardinality AS "maximumCardinality",
  dtd_identifier AS "dtdIdentifier",
  is_self_referencing AS "isSelfReferencing",
  is_identity AS "isIdentity",
  identity_generation AS "identityGeneration",
  identity_start AS "identityStart",
  identity_increment AS "identityIncrement",
  identity_maximum AS "identityMaximum",
  identity_minimum AS "identityMinimum",
  identity_cycle AS "identityCycle",
  is_generated AS "isGenerated",
  generation_expression AS "generationExpression",
  is_updatable AS "isUpdatable"
FROM information_schema.columns
WHERE table_schema NOT IN ('information_schema', 'pg_catalog');
`;

const scanTablesRelationsQuery = `
SELECT
    tc.constraint_name, 
    tc.table_schema, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
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
      SELECT  DISTINCT strict_word_similarity('${value}', "${column}") AS similarity, "${column}" AS value
      FROM    "${table}"
      WHERE   strict_word_similarity('${value}', "${column}") > 0.8
      LIMIT 10
    ) AS foo
    UNION 
    SELECT *
    FROM (
      SELECT  DISTINCT strict_word_similarity('${value}', "${column}") AS similarity, "${column}" AS value
      FROM    "${table}"
      WHERE   strict_word_similarity('${value}', "${column}") > 0.2
      ORDER BY strict_word_similarity('${value}', "${column}") DESC
      LIMIT 3
    ) AS foo2
  `;
};

export class BigQueryService extends DatabaseService {
  client: Client;

  constructor(databaseConfig) {
    super();
    this.client = new Client(databaseConfig);
    this.client.connect();
    this.client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
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

    const { rows } = await this.client.query(sqlWrapper);
    let count = rows.length;
    if (count == DEFAULT_QUERY_LIMIT) {
      const resCount = await this.client.query(sqlCountWrapper);
      count = resCount.rows[0].count;
    }

    return {
      rows,
      count,
    };
  }

  async fetchClosedValues(table: string, column: string, value: string) {
    const results = await this.client.query(
      scanColumnClosedExamplesQuery(table, column, value),
    );
    return results.rows.map((row) => row.value);
  }

  async scanTables() {
    const tablesRes = await this.client.query(scanTablesQuery);
    const tablesColumnsRes = await this.client.query(scanTablesColumnsQuery);
    const tablesRelationsRes = await this.client.query(
      scanTablesRelationsQuery,
    );

    await Promise.all(
      tablesRes.rows.map(async (table) => {
        table.columns = tablesColumnsRes.rows.filter((colRow) => {
          return (
            colRow.tableName === table.name &&
            colRow.schemaName === table.schemaName
          );
        });
        await Promise.all(
          table.columns.map(async (column) => {
            const results = await this.client.query(
              scanColumnRandomExampleQuery(table.name, column.columnName),
            );
            column.examples = results.rows.map((row) =>
              String(row.value).slice(0, 100),
            );

            const relation = tablesRelationsRes.rows.find((relation) => {
              return (
                relation.table_schema == column.schemaName &&
                relation.table_name == column.tableName &&
                relation.column_name == column.columnName
              );
            });

            if (relation) {
              column.foreignTableSchema = relation.foreign_table_schema;
              column.foreignTable = relation.foreign_table_name;
              column.foreignColumn = relation.foreign_column_name;
            }
          }),
        );
      }),
    );
    return tablesRes.rows;
  }
}