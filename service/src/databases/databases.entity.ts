import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne,
  OneToOne,
} from 'typeorm';
import { Organisation, User } from '../users/users.entity';
import { Table } from '../tables/tables.entity';

interface Details {
  host: string;
  port: string;
  user: string;
  database: string;
  password: string;
}
@Entity()
export class Database {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  engine: string;

  @Column('jsonb', { array: false })
  details: Details;

  @OneToMany(() => Table, (table) => table.database)
  tables: Table[];

  @Column({ nullable: true })
  organisationId: string;

  @ManyToOne(() => Organisation, (organisation) => organisation.databases)
  organisation: Organisation;

  @Column({ nullable: true })
  ownerId: string;

  @Column({ default: false })
  public: boolean;

  @ManyToOne(() => User, (user) => user.databases)
  owner: User;
}
