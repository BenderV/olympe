/*
created_at: 1659504816
email: "benderville@gmail.com"
emailConfirmed: true
enabled: true
has_password: true
last_active_at: 1659538736
locked: false
mfaEnabled: false
pictureUrl: "https://img.propelauth.com/2a27d237-db8c-4f82-84fb-5824dfaedc87.png"
userId: "8047b237-bb37-4ffc-83a0-14a50e232cd6"
*/
import { Database } from '../databases/databases.entity';
import { Query } from '../queries/queries.entity';
import { Entity, Column, PrimaryColumn, ManyToOne, OneToMany } from 'typeorm';
import { File } from '../files/files.entity';

@Entity()
export class User {
  @PrimaryColumn()
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  pictureUrl: string;

  @Column({ default: false })
  emailConfirmed: boolean;

  @Column({ default: false })
  enabled: boolean;

  @Column({ default: false })
  locked: boolean;

  @Column({ default: false })
  mfaEnabled: boolean;

  @Column()
  lastActiveAt: number;

  @OneToMany(
    () => UserToOrganisation,
    (userToOrganisation) => userToOrganisation.user,
    { cascade: true },
  )
  userToOrganisations!: UserToOrganisation[];

  @OneToMany(() => File, (file) => file.user, {
    cascade: true,
  })
  files: File[];

  @OneToMany(() => Database, (database) => database.owner, {
    cascade: true,
  })
  databases: Database[];

  @OneToMany(() => Query, (query) => query.creator)
  queries: Query[];
}

@Entity()
export class Organisation {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @OneToMany(
    () => UserToOrganisation,
    (userToOrganisation) => userToOrganisation.organisation,
  )
  usersToOrganisation!: UserToOrganisation[];

  @OneToMany(() => Database, (database) => database.organisation)
  databases: Database[];
}

@Entity()
export class UserToOrganisation {
  @PrimaryColumn()
  userId!: string;

  @PrimaryColumn()
  organisationId!: string;

  @ManyToOne(() => User, (user) => user.userToOrganisations)
  user!: User;

  @ManyToOne(() => Organisation, (org) => org.usersToOrganisation, {
    cascade: true,
  })
  organisation!: Organisation;

  @Column()
  role: number;
}
