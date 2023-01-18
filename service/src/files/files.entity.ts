import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { User } from '../users/users.entity';

/* 
  fieldname: 'file',
  originalname: 'ds_salaries.csv',
  encoding: '7bit',
  mimetype: 'text/csv',
  destination: './uploads',
  filename: '6e7ac921199ce02328395e3f8d6a914a',
  size: 36960
*/

@Entity()
export class File {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.files)
  user: User;

  @Column()
  mimetype: string;

  @Column()
  originalname: string;

  @Column()
  size: number;
}
