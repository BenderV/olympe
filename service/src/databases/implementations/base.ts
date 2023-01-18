import { Table } from '../../tables/tables.entity';

export abstract class DatabaseService {
  /*
   * Connect to the database
   */
  abstract connect(databaseConfig);

  /*
   * Run SQL query on database
   */
  abstract runQuery(sqlQuery: string);

  /*
   * Fetch distinct values from a column that are similar to the given value
   * The goal is to have 1-5 most similar values (based on similarity and frequency)
   */
  abstract fetchClosedValues(table: string, column: string, value: string);

  /*
   * Scan all tables in the database and return a list of tables with their columns
   */
  abstract scanDatabase(): Promise<Table[]>;
}

export function replaceAll(str, find, replace) {
  return str.replace(new RegExp(find, 'g'), replace);
}
