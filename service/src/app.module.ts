import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DatabasesModule } from './databases/databases.module';
import { Database } from './databases/databases.entity';

import { QueryModule } from './queries/queries.module';
import { Prediction, Query } from './queries/queries.entity';

// FilesModules
import { File } from './files/files.entity';
import { FilesModules } from './files/files.module';

import { TablesModule } from './tables/tables.module';
import { Table, TableColumn } from './tables/tables.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { Organisation, User, UserToOrganisation } from './users/users.entity';
import auth from './propelauth';

import { Injectable, NestMiddleware } from '@nestjs/common';
import e, { Request, Response, NextFunction } from 'express';
import { UsersService } from './users/users.service';
import { LoggerModule } from 'nestjs-pino';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly usersService: UsersService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    let user: User = null;
    console.log('req.user', req.user);
    if (req.user) {
      user = await this.usersService.getUser(req.user.userId);
      if (!user) {
        // Create user
        const userMetadata = await auth.fetchUserMetadataByUserId(
          req.user.userId,
          true, // includeOrgs
        );
        // Map userMetadata to User
        // orgIdToOrgInfo: {
        //   '6264fdaf-e8e2-41a8-a110-0fccc0e71277': {
        //     orgId: '6264fdaf-e8e2-41a8-a110-0fccc0e71277',
        //     orgName: 'test',
        //     userRole: 2
        //   }
        // }
        user = {
          ...user,
          ...userMetadata,
          id: userMetadata.userId,
          userToOrganisations: Object.keys(userMetadata.orgIdToOrgInfo).map(
            (orgId) => {
              const orgInfo = userMetadata.orgIdToOrgInfo[orgId];
              return {
                userId: userMetadata.userId,
                role: orgInfo.userRole,
                organisation: {
                  id: orgInfo.orgId,
                  name: orgInfo.orgName,
                },
              };
            },
          ) as UserToOrganisation[],
        };
        console.log(user);
        await this.usersService.createUser(user);
      }
    }
    // @ts-ignore
    req.user = user;
    next();
  }
}

const pinoPrettyConfig = {
  target: 'pino-pretty',
  options: {
    singleLine: true,
  },
};

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
        transport:
          process.env.NODE_ENV !== 'production' ? pinoPrettyConfig : undefined,
      },
    }),
    ConfigModule.forRoot(),
    DatabasesModule,
    QueryModule,
    TablesModule,
    UsersModule,
    FilesModules,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const isLocal =
          configService.get<string>('DATABASE_URL').indexOf('localhost') !== -1;
        const sslConfig = isLocal
          ? {}
          : {
              ssl: true,
              extra: {
                ssl: {
                  rejectUnauthorized: false,
                },
              },
            };

        return {
          logging: process.env.TYPEORM_LOGGING === 'true',
          type: 'postgres',
          entities: [
            Database,
            Table,
            TableColumn,
            Query,
            Prediction,
            User,
            Organisation,
            UserToOrganisation,
            File,
          ],
          url: configService.get<string>('DATABASE_URL'),
          synchronize: true,
          ...sslConfig,
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(auth.optionalUser).forRoutes('*');
    consumer.apply(AuthMiddleware).forRoutes('*');
  }
}
