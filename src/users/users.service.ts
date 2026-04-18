import { Injectable, NotFoundException } from '@nestjs/common';
import { unlink } from 'fs/promises';
import { basename, join } from 'path';
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

  async uploadProfileImage(userId: number, file: Express.Multer.File) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const previousImagePath = user.imageUrl;
    user.imageUrl = `uploads/users/${file.filename}`;
    await this.userRepository.save(user);

    if (previousImagePath) {
      await this.tryDeleteUserImageFile(previousImagePath);
    }

    return {
      message: 'Profile image uploaded successfully',
      imageUrl: user.imageUrl,
    };
  }

  async deleteProfileImage(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.imageUrl) {
      return { message: 'No profile image to delete', imageUrl: null };
    }

    const existingImagePath = user.imageUrl;
    user.imageUrl = null;
    await this.userRepository.save(user);

    await this.tryDeleteUserImageFile(existingImagePath);

    return {
      message: 'Profile image deleted successfully',
      imageUrl: null,
    };
  }

  private async tryDeleteUserImageFile(pathToImage: string) {
    const sanitizedFileName = basename(pathToImage);
    if (!sanitizedFileName) {
      return;
    }

    const absolutePath = join(process.cwd(), 'uploads', 'users', sanitizedFileName);

    try {
      await unlink(absolutePath);
    } catch {
      // Keep DB state as source of truth if file is missing on disk.
    }
  }
}
