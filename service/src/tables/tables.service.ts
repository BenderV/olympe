import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { Table } from './tables.entity';

type RemoveNull<T> = {
  [K in keyof T]: Exclude<RemoveNull<T[K]>, null>;
};

function removeNull<T>(obj: T): RemoveNull<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v != null),
  ) as RemoveNull<T>;
}

@Injectable()
export class TablesService {
  constructor(
    @InjectRepository(Table)
    private tablesRepository: Repository<Table>,
  ) {}

  findAll(): Promise<Table[]> {
    return this.tablesRepository.find(); // { relations: ['columns'] }
  }

  findOne(id: number): Promise<Table> {
    return this.tablesRepository.findOne(id);
  }

  async getDatabaseSchema(databaseId: number) {
    const res = await this.tablesRepository.find({
      where: {
        used: true,
        databaseId: databaseId,
      },
      relations: ['columns'],
    });
    return res.map((table) => {
      return removeNull({
        schemaName: table.schemaName,
        name: table.name,
        description: table.description,
        columns: table.columns.map((column) => {
          return removeNull({
            name: column.columnName,
            dataType: column.dataType,
            isIdentity: column.isIdentity,
            description: column.description,
            foreignTableSchema: column.foreignTableSchema,
            foreignTable: column.foreignTable,
            foreignColumn: column.foreignColumn,
            examples: column.examples,
          });
        }),
      });
    });
  }

  async upsertBulk(databaseId, tables: Table[]): Promise<Table[]> {
    // Remove table that are not in the new list
    await this.tablesRepository.delete({
      databaseId,
      name: Not(In(tables.map((table) => table.name))),
    });
    return this.tablesRepository.save(tables);
  }

  async remove(id: string): Promise<void> {
    await this.tablesRepository.delete(id);
  }
}
