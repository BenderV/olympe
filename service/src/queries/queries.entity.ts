import { Database } from '../databases/databases.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../users/users.entity';
import { DefaultTable } from '../utils';

type openAIResponse = {
  id: string;
  object: string;
  created: Date;
  model: string;
  choices: [
    {
      text: string;
      index: number;
      logprobs: number;
      finish_reason: string;
    },
  ];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

@Entity()
export class Query extends DefaultTable {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.queries)
  creator: User;

  @Column()
  databaseId: number;

  @ManyToOne(() => Database, (ref) => ref.tables)
  database: Database;

  @Column()
  query: string;

  // DEPRECIATED
  @Column({ nullable: true, type: 'jsonb', select: false })
  result: openAIResponse;

  @Column({ nullable: true })
  validatedSQL: string;

  @Column({ nullable: true })
  comment: string;

  @Column('simple-array', { nullable: true })
  tables!: string[];

  @Column('simple-array', { nullable: true })
  wheres!: string[];

  @OneToMany(() => Prediction, (table) => table.query)
  predictions: Prediction[];

  @Column({ nullable: true })
  tag: string;
}

@Entity()
export class Prediction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  queryId: number;

  @ManyToOne(() => Query, (ref) => ref.predictions)
  query: Query;

  // @Column()
  // query: string;

  @Column()
  modelName: string;

  @Column({ select: false })
  prompt: string;

  @Column()
  output: string;

  @Column({ type: 'jsonb', nullable: true })
  value: string;

  @Column({ nullable: true, type: 'jsonb' })
  openAIResponse: openAIResponse;
}
