import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user (client or provider)' })
  @ApiBody({
    type: RegisterDto,
    examples: {
      client: {
        summary: 'Client registration',
        value: {
          name: 'Ali Ben Salah',
          email: 'ali@example.com',
          phoneNumber: '+21620111222',
          password: 'StrongP@ss1',
          dateOfBirth: '2000-05-12',
          address: 'Tunis, Tunisia',
          isProvider: false,
        },
      },
      provider: {
        summary: 'Provider registration',
        value: {
          name: 'Sara Trabelsi',
          email: 'sara@example.com',
          phoneNumber: '+21629999888',
          password: 'StrongP@ss1',
          dateOfBirth: '1997-10-01',
          address: 'Sfax, Tunisia',
          isProvider: true,
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'User registered successfully',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: {
          message:
            'Registration successful. Verification email sent. Please verify your email before login.',
          verificationToken: 'a1b2c3d4e5f6...',
          user: {
            id: 12,
            name: 'Ali Ben Salah',
            email: 'ali@example.com',
            phoneNumber: '+21620111222',
            dateOfBirth: '2000-05-12',
            address: 'Tunis, Tunisia',
            imageUrl: null,
            isAdmin: false,
            isProvider: false,
            isSuspended: false,
            providerValidationStatus: null,
            emailVerifiedAt: null,
            emailNotificationsEnabled: true,
          },
        },
      },
    },
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify user email with verification token' })
  @ApiBody({
    type: VerifyEmailDto,
    examples: {
      default: {
        summary: 'Email verification token',
        value: { token: 'a1b2c3d4e5f6...' },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Email verified successfully',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: {
          message: 'Email verified successfully',
        },
      },
    },
  })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Send password reset email' })
  @ApiBody({
    type: ForgotPasswordDto,
    examples: {
      default: {
        summary: 'Forgot password',
        value: { email: 'ali@example.com' },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Password reset email flow initiated',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: {
          message:
            'If this email exists, a password reset link has been sent to it.',
          resetToken: 'f7d6c5b4a3...',
        },
      },
    },
  })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using reset token' })
  @ApiBody({
    type: ResetPasswordDto,
    examples: {
      default: {
        summary: 'Reset password payload',
        value: {
          token: 'f7d6c5b4a3...',
          newPassword: 'NewStrongP@ss1',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Password reset completed',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: {
          message: 'Password reset successful. You can now login.',
        },
      },
    },
  })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email or phone number and password' })
  @ApiBody({
    type: LoginDto,
    examples: {
      emailLogin: {
        summary: 'Login with email',
        value: { identifier: 'ali@example.com', password: 'StrongP@ss1' },
      },
      phoneLogin: {
        summary: 'Login with phone',
        value: { identifier: '+21620111222', password: 'StrongP@ss1' },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'User logged in successfully',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: {
          user: {
            id: 12,
            name: 'Ali Ben Salah',
            email: 'ali@example.com',
            phoneNumber: '+21620111222',
            dateOfBirth: '2000-05-12',
            address: 'Tunis, Tunisia',
            imageUrl: null,
            isAdmin: false,
            isProvider: false,
            isSuspended: false,
            providerValidationStatus: null,
            emailVerifiedAt: '2026-04-18T14:27:00.000Z',
            emailNotificationsEnabled: true,
          },
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh',
        },
      },
    },
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Get new access and refresh tokens' })
  @ApiBearerAuth()
  @ApiBody({
    type: RefreshTokenDto,
    examples: {
      default: {
        summary: 'Refresh token payload',
        value: { refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Tokens refreshed successfully',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new-access',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new-refresh',
        },
      },
    },
  })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }
}
