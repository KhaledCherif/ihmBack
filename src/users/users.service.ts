import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { User } from '../database/entities';

@Injectable()
export class UsersService {
  constructor(
    private readonly authService: AuthService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  getMyProfile(userId: number) {
    return this.authService.getCurrentUser(userId);
  }

  async updateEmailNotifications(userId: number, enabled: boolean) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.emailNotificationsEnabled = enabled;
    await this.userRepository.save(user);

    return {
      message: 'Email notification preference updated',
      emailNotificationsEnabled: user.emailNotificationsEnabled,
    };
  }
}
