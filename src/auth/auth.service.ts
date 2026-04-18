import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import * as nodemailer from 'nodemailer';
import { IsNull, MoreThan, Not, Repository } from 'typeorm';
import { ProviderValidationStatus } from '../common/enums/provider-validation-status.enum';
import { User } from '../database/entities';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

const SALT_ROUNDS = 10;
const LOCK_ATTEMPTS = 5;
const LOCK_MINUTES = 5;
const EMAIL_TOKEN_VALIDITY_HOURS = 24;
const RESET_TOKEN_VALIDITY_MINUTES = 30;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly mailTransporter: nodemailer.Transporter | null;

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {
    this.mailTransporter = this.createTransporter();
  }

  async register(dto: RegisterDto) {
    this.validateAdult(dto.dateOfBirth);

    const existing = await this.usersRepository.findOne({
      where: [{ email: dto.email }, { phoneNumber: dto.phoneNumber }],
    });

    if (existing) {
      throw new BadRequestException('Email or phone number already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const rawVerificationToken = randomBytes(32).toString('hex');
    const emailVerificationTokenHash = await bcrypt.hash(
      rawVerificationToken,
      SALT_ROUNDS,
    );

    const isProvider = Boolean(dto.isProvider);

    const user = this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      passwordHash,
      dateOfBirth: dto.dateOfBirth,
      address: dto.address,
      imageUrl: null,
      isAdmin: false,
      isProvider,
      isSuspended: false,
      suspendedReason: null,
      suspendedAt: null,
      failedLoginAttempts: 0,
      lockUntil: null,
      emailVerifiedAt: null,
      refreshTokenHash: null,
      emailVerificationTokenHash,
      emailVerificationExpiresAt: new Date(
        Date.now() + EMAIL_TOKEN_VALIDITY_HOURS * 60 * 60 * 1000,
      ),
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
      providerValidationStatus: isProvider
        ? ProviderValidationStatus.PENDING
        : null,
      hiddenReviewsCount: 0,
      lostConflictsCount: 0,
    });

    const savedUser = await this.usersRepository.save(user);
    const verificationLink = this.buildVerificationLink(rawVerificationToken);

    await this.sendEmail({
      to: savedUser.email,
      subject: 'Verify your email',
      html: this.renderVerificationEmail(savedUser.name, verificationLink),
    });

    return {
      message:
        'Registration successful. Verification email sent. Please verify your email before login.',
      ...(process.env.NODE_ENV !== 'production'
        ? { verificationToken: rawVerificationToken }
        : {}),
      user: this.toPublicUser(savedUser),
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const candidates = await this.usersRepository.find({
      where: {
        emailVerificationTokenHash: Not(IsNull()),
        emailVerificationExpiresAt: MoreThan(new Date()),
      },
      take: 100,
    });

    let matchedUser: User | null = null;
    for (const candidate of candidates) {
      if (!candidate.emailVerificationTokenHash) {
        continue;
      }
      const isMatch = await bcrypt.compare(
        dto.token,
        candidate.emailVerificationTokenHash,
      );
      if (isMatch) {
        matchedUser = candidate;
        break;
      }
    }

    if (!matchedUser) {
      throw new UnauthorizedException('Invalid or expired email verification token');
    }

    matchedUser.emailVerifiedAt = new Date();
    matchedUser.emailVerificationTokenHash = null;
    matchedUser.emailVerificationExpiresAt = null;

    await this.usersRepository.save(matchedUser);

    return {
      message: 'Email verified successfully',
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      return {
        message:
          'If this email exists, a password reset link has been sent to it.',
      };
    }

    const rawResetToken = randomBytes(32).toString('hex');
    user.passwordResetTokenHash = await bcrypt.hash(rawResetToken, SALT_ROUNDS);
    user.passwordResetExpiresAt = new Date(
      Date.now() + RESET_TOKEN_VALIDITY_MINUTES * 60 * 1000,
    );

    await this.usersRepository.save(user);

    const resetLink = this.buildResetPasswordLink(rawResetToken);
    await this.sendEmail({
      to: user.email,
      subject: 'Reset your password',
      html: this.renderResetPasswordEmail(user.name, resetLink),
    });

    return {
      message:
        'If this email exists, a password reset link has been sent to it.',
      ...(process.env.NODE_ENV !== 'production'
        ? { resetToken: rawResetToken }
        : {}),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const candidates = await this.usersRepository.find({
      where: {
        passwordResetTokenHash: Not(IsNull()),
        passwordResetExpiresAt: MoreThan(new Date()),
      },
      take: 100,
    });

    let matchedUser: User | null = null;
    for (const candidate of candidates) {
      if (!candidate.passwordResetTokenHash) {
        continue;
      }
      const isMatch = await bcrypt.compare(
        dto.token,
        candidate.passwordResetTokenHash,
      );
      if (isMatch) {
        matchedUser = candidate;
        break;
      }
    }

    if (!matchedUser) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    matchedUser.passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    matchedUser.passwordResetTokenHash = null;
    matchedUser.passwordResetExpiresAt = null;
    matchedUser.failedLoginAttempts = 0;
    matchedUser.lockUntil = null;
    matchedUser.refreshTokenHash = null;

    await this.usersRepository.save(matchedUser);

    return {
      message: 'Password reset successful. You can now login.',
    };
  }

  async login(dto: LoginDto) {
    const identifier = dto.identifier.trim();
    const isEmail = identifier.includes('@');

    const user = await this.usersRepository.findOne({
      where: isEmail
        ? { email: identifier.toLowerCase() }
        : { phoneNumber: identifier },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    this.throwIfSuspended(user);
    this.throwIfLocked(user);

    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException('Email is not verified');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      await this.handleFailedAttempt(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;

    const tokens = await this.issueTokens(user);
    user.refreshTokenHash = await bcrypt.hash(tokens.refreshToken, SALT_ROUNDS);

    await this.usersRepository.save(user);

    return {
      user: this.toPublicUser(user),
      ...tokens,
    };
  }

  async refresh(dto: RefreshTokenDto) {
    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(dto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersRepository.findOne({ where: { id: payload.sub } });
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    this.throwIfSuspended(user);
    this.throwIfLocked(user);

    const isRefreshValid = await bcrypt.compare(
      dto.refreshToken,
      user.refreshTokenHash,
    );

    if (!isRefreshValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.issueTokens(user);
    user.refreshTokenHash = await bcrypt.hash(tokens.refreshToken, SALT_ROUNDS);
    await this.usersRepository.save(user);

    return tokens;
  }

  async getCurrentUser(userId: number) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    this.throwIfSuspended(user);

    return this.toPublicUser(user);
  }

  private async issueTokens(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
      isProvider: user.isProvider,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
      expiresIn: Number(process.env.JWT_ACCESS_EXPIRES_IN_SECONDS ?? 900),
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
      expiresIn: Number(process.env.JWT_REFRESH_EXPIRES_IN_SECONDS ?? 604800),
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private async handleFailedAttempt(user: User) {
    const nextAttempts = (user.failedLoginAttempts ?? 0) + 1;
    user.failedLoginAttempts = nextAttempts;

    if (nextAttempts >= LOCK_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      user.failedLoginAttempts = 0;
    }

    await this.usersRepository.save(user);
  }

  private throwIfSuspended(user: User): void {
    if (user.isSuspended) {
      throw new UnauthorizedException('Your account is banned');
    }
  }

  private throwIfLocked(user: User): void {
    if (user.lockUntil && user.lockUntil > new Date()) {
      throw new UnauthorizedException(
        'Account temporarily locked. Try again in 5 minutes',
      );
    }
  }

  private validateAdult(dateOfBirth: string): void {
    const dob = new Date(dateOfBirth);
    const now = new Date();

    let age = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
      age -= 1;
    }

    if (Number.isNaN(dob.getTime()) || age < 18) {
      throw new BadRequestException('Minimum age required is 18');
    }
  }

  private toPublicUser(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      dateOfBirth: user.dateOfBirth,
      address: user.address,
      imageUrl: user.imageUrl,
      isAdmin: user.isAdmin,
      isProvider: user.isProvider,
      isSuspended: user.isSuspended,
      providerValidationStatus: user.providerValidationStatus,
      emailVerifiedAt: user.emailVerifiedAt,
    };
  }

  private createTransporter(): nodemailer.Transporter | null {
    const host = process.env.SMTP_HOST ?? 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT ?? 587);
    const secure =
      (process.env.SMTP_SECURE ?? '').toLowerCase() === 'true' || port === 465;
    const user =
      process.env.SMTP_USER ??
      process.env.MAIL_USER ??
      process.env.GMAIL_USER ??
      this.extractEmailAddress(process.env.MAIL_FROM);

    const rawPass =
      process.env.SMTP_PASS ??
      process.env.SMTP_APP_PASSWORD ??
      process.env.APP_PASSWORD ??
      process.env.app_password;

    const pass = rawPass ? rawPass.replace(/\s+/g, '') : null;

    if (!user || !pass) {
      this.logger.warn(
        'Mailer transporter not initialized. Missing SMTP_USER (or MAIL_USER/GMAIL_USER/MAIL_FROM) and/or SMTP_PASS (or SMTP_APP_PASSWORD/APP_PASSWORD).',
      );
      return null;
    }

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  private async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    if (!this.mailTransporter) {
      throw new InternalServerErrorException(
        'Email service is not configured. Set SMTP_USER and APP_PASSWORD (or SMTP_PASS), plus MAIL_FROM.',
      );
    }

    const from = process.env.MAIL_FROM ?? process.env.SMTP_USER;
    if (!from) {
      throw new InternalServerErrorException('MAIL_FROM or SMTP_USER is required');
    }

    try {
      await this.mailTransporter.sendMail({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send email to ${params.to}: ${message}`);
      throw new InternalServerErrorException(
        `Failed to send email: ${message}`,
      );
    }
  }

  private extractEmailAddress(value?: string): string | null {
    if (!value) {
      return null;
    }

    const match = value.match(/<([^>]+)>/);
    if (match?.[1]) {
      return match[1];
    }

    return value.includes('@') ? value : null;
  }

  private buildVerificationLink(token: string): string {
    const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:3000';
    const path = process.env.EMAIL_VERIFY_PATH ?? '/verify-email';
    return `${baseUrl}${path}?token=${encodeURIComponent(token)}`;
  }

  private buildResetPasswordLink(token: string): string {
    const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:3000';
    const path = process.env.RESET_PASSWORD_PATH ?? '/reset-password';
    return `${baseUrl}${path}?token=${encodeURIComponent(token)}`;
  }

  private renderVerificationEmail(name: string, verificationLink: string): string {
    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Welcome ${name}, verify your email</h2>
        <p>Click the button below to verify your account:</p>
        <p>
          <a href="${verificationLink}" style="padding: 10px 16px; background: #0f766e; color: #fff; text-decoration: none; border-radius: 6px;">
            Verify Email
          </a>
        </p>
        <p>If the button does not work, use this link:</p>
        <p>${verificationLink}</p>
      </div>
    `;
  }

  private renderResetPasswordEmail(name: string, resetLink: string): string {
    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Hello ${name}, reset your password</h2>
        <p>This link is valid for ${RESET_TOKEN_VALIDITY_MINUTES} minutes.</p>
        <p>
          <a href="${resetLink}" style="padding: 10px 16px; background: #1d4ed8; color: #fff; text-decoration: none; border-radius: 6px;">
            Reset Password
          </a>
        </p>
        <p>If you did not request this, ignore this email.</p>
        <p>${resetLink}</p>
      </div>
    `;
  }
}
