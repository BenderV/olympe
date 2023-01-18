import { Client } from 'pg';
import { Table } from 'src/tables/tables.entity';
import { DatabaseService, replaceAll } from './base';

const DEFAULT_QUERY_LIMIT = 1000;

const scanTablesQuery = `
    SELECT
      "schemaname" AS "schemaName",
      "relname" AS "name",
      pgd.description as "description"
    FROM pg_catalog.pg_statio_all_tables AS st
    LEFT JOIN pg_catalog.pg_description pgd ON (
        pgd.objoid = st.relid
        AND objsubid = 0
    )
    WHERE "schemaname" NOT IN ('information_schema', 'pg_catalog', 'pg_toast');
`;

const scanTablesColumnsQuery = `
SELECT
  table_schema AS "schemaName",
	table_name AS "tableName",
	-- ordinal_position as position,
	column_name AS "columnName",
	data_type AS "dataType",
	-- case when character_maximum_length is not null then character_maximum_length else numeric_precision end as max_length,
	-- is_nullable,
	-- column_default as default_value,
	pgd.description,
  c.is_identity='YES' AS "isIdentity"
FROM pg_catalog.pg_statio_all_tables AS st
LEFT JOIN information_schema.columns c ON (
    c.table_schema = st.schemaname AND
    c.table_name   = st.relname
)
LEFT JOIN pg_catalog.pg_description pgd ON (
	  pgd.objsubid = c.ordinal_position AND
    pgd.objoid = st.relid
)
WHERE table_schema NOT IN ('information_schema', 'pg_catalog');
`;

const scanTablesRelationsQuery = `
SELECT
    -- tc.constraint_name, 
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

export class PostgresService extends DatabaseService {
  client: Client;

  constructor() {
    super();
  }

  async connect(databaseConfig: object) {
    this.client = await new Client(databaseConfig);
    await this.client.connect();
    await this.client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
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

  async scanDatabase(): Promise<Table[]> {
    console.log('Scanning database...');
    const tablesRes = await this.client.query(scanTablesQuery);
    console.log(tablesRes);
    console.log('Scanning tables columns...');
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
