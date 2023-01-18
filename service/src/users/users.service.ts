import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './users.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  getUser(id: string): Promise<User> {
    return this.usersRepository.findOne({
      where: {
        id,
      },
      relations: ['userToOrganisations', 'userToOrganisations.organisation'],
    });
  }

  createUser(user: User): Promise<User> {
    return this.usersRepository.save(user);
  }
}
