import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Database } from './databases.entity';
import { Client } from 'pg';
import { User } from '../users/users.entity';
import * as _ from 'lodash';
import { PostgresService } from './implementations/postgresql';
import { TablesService } from '../tables/tables.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

const generateDatabaseName = (): string => {
  return Math.random().toString(36).slice(-8);
};

@Injectable()
export class DatabasesService {
  constructor(
    private tablesService: TablesService,

    @InjectRepository(Database)
    private databasesRepository: Repository<Database>,
  ) {}

  findAll(): Promise<Database[]> {
    return this.databasesRepository.find();
  }

  async fetchUserDatabases(
    userId: string,
    organisationIds: string[],
  ): Promise<Database[]> {
    return this.databasesRepository.find({
      where: [
        { organisationId: In(organisationIds) },
        { ownerId: userId },
        { public: true },
      ],
    });
  }

  findOne(id: number): Promise<Database> {
    return this.databasesRepository.findOne(id);
  }

  async delete(id) {
    return await this.databasesRepository.delete(id);
  }

  async create(database): Promise<Database> {
    return this.databasesRepository.save(database);
  }

  async update(id, database): Promise<Database> {
    await this.databasesRepository.save(database);
    return this.databasesRepository.findOne(id);
  }

  async _scanDatabase(databaseConfig) {
    try {
      const conn = new PostgresService();
      await conn.connect(databaseConfig);
      const tablesRaw = await conn.scanDatabase();
      await conn.client.end();
      return tablesRaw;
    } catch (e) {
      throw new HttpException(
        {
          message: e.message,
        },
        400,
      );
    }
  }

  async scanDatabase(id: number) {
    const database = await this.findOne(id);
    const tablesRaw = await this._scanDatabase(database.details);
    _.each(tablesRaw, (t) => {
      t.databaseId = database.id;
    });
    await this.tablesService.upsertBulk(database.id, tablesRaw);
    return await this.tablesService.getDatabaseSchema(id);
  }

  async fetchUserPlaygroundDatabase(userId: string): Promise<Database> {
    return this.databasesRepository.findOne({
      where: { ownerId: userId, name: 'playground' },
    });
  }

  async importNetflixData(client) {
    client.query(`
      CREATE TABLE netflix_titles (
        show_id text,
        type text,
        title text,
        director text,
        "cast" text,
        country text,
        date_added text,
        release_year bigint,
        rating text,
        duration text,
        listed_in text,
        description text
    );`);

    client.query(`
      COPY netflix_titles(show_id, type, title, director, "cast", country, date_added, release_year, rating, duration, listed_in, description)
      FROM './data/examples/netflix_titles.csv' -- TODO: fix
      DELIMITER ','
      CSV HEADER;
    `);
  }

  async createUserPlaygroundDatabase(
    name: string,
    user: User,
  ): Promise<Database> {
    const databaseUser = generateDatabaseName();
    const databaseName = 'playground_' + databaseUser;
    const databasePassword = generateDatabaseName();

    const PLAYGROUND_URI = process.env.PLAYGROUND_URI;

    const client = new Client(PLAYGROUND_URI);

    client.connect();
    await client.query(`CREATE DATABASE "${databaseName}";`);
    await client.query('COMMIT');
    // clientGeneric.release();
    // https://stackoverflow.com/a/14032668/2131871
    client.query(
      `REVOKE ALL PRIVILEGES ON DATABASE "${databaseName}" FROM public;`,
    );
    client.query(
      `CREATE USER "${databaseUser}" WITH PASSWORD '${databasePassword}';`,
    );
    client.query(
      `GRANT CONNECT ON DATABASE "${databaseName}" TO "${databaseUser}";`,
    );
    client.query(
      `GRANT ALL PRIVILEGES ON DATABASE "${databaseName}" TO "${databaseUser}";`,
    );
    client.query(`GRANT ALL PRIVILEGES ON SCHEMA public TO "${databaseUser}";`);
    client.query(
      `GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "${databaseUser}";`,
    );
    await client.query('COMMIT');

    const database = await this.create({
      owner: user,
      name: name,
      engine: 'postgres',
      details: {
        host: client.host,
        user: databaseUser,
        password: databasePassword,
        database: databaseName,
        port: client.port,
      },
    });

    return database;
  }
}
