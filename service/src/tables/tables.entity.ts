import { Database } from '../databases/databases.entity';
import { Entity, Column, PrimaryColumn, OneToMany, ManyToOne } from 'typeorm';

@Entity()
export class Table {
  @PrimaryColumn()
  databaseId: number;

  @ManyToOne(() => Database, (ref) => ref.tables)
  database: Database;

  @PrimaryColumn({ default: 'public' })
  schemaName: string;

  @PrimaryColumn()
  name: string;

  @Column({ nullable: true })
  description: string;

  @OneToMany(() => TableColumn, (ref) => ref.table, {
    cascade: true,
  })
  columns: TableColumn[];

  @Column({ default: true })
  used: boolean;
}

@Entity()
export class TableColumn {
  @PrimaryColumn()
  tableDatabaseId: number;

  @PrimaryColumn({ default: 'public' })
  tableSchemaName: string;

  @PrimaryColumn()
  tableName: string;

  @ManyToOne(() => Table, (ref) => ref.columns, { onDelete: 'CASCADE' })
  table: Table;

  @PrimaryColumn()
  columnName: string;

  @Column()
  dataType: string;

  @Column({ default: false })
  isIdentity: boolean;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  foreignTableSchema: string;

  @Column({ nullable: true })
  foreignTable: string;

  @Column({ nullable: true })
  foreignColumn: string;

  // Store array with different values types (string, number, date, etc)
  // @Column({ nullable: true })
  // examples: string[];

  @Column({ type: 'text', array: true, nullable: true })
  examples: string[];
}
