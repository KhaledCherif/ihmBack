import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class UsersService {
  constructor(private readonly authService: AuthService) {}

  getMyProfile(userId: number) {
    return this.authService.getCurrentUser(userId);
  }
}
