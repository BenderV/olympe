import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organisation, User, UserToOrganisation } from './users.entity';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Organisation, UserToOrganisation])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
