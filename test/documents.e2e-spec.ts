import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, IsNull, Repository } from 'typeorm';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { ProviderValidationStatus } from '../src/common/enums/provider-validation-status.enum';
import { Document, ProviderValidationLog, User } from '../src/database/entities';
import { setupApp } from '../src/setup-app';

jest.setTimeout(30000);

describe('DocumentsModule (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let documentRepository: Repository<Document>;
  let providerValidationLogRepository: Repository<ProviderValidationLog>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app as never);
    await app.init();

    dataSource = app.get(DataSource);
    userRepository = dataSource.getRepository(User);
    documentRepository = dataSource.getRepository(Document);
    providerValidationLogRepository = dataSource.getRepository(ProviderValidationLog);
  });

  beforeEach(async () => {
    await providerValidationLogRepository.clear();
    await documentRepository.clear();
    await userRepository.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  it('uploads multiple allowed files and sets provider status to pending', async () => {
    const providerEmail = 'provider.docs@example.com';
    const providerPassword = 'StrongP@ss1';

    const providerToken = await registerVerifyAndLoginUser({
      name: 'Provider Docs',
      email: providerEmail,
      phoneNumber: '+21650000111',
      password: providerPassword,
      dateOfBirth: '1995-02-10',
      address: 'Tunis',
      isProvider: true,
    });

    const uploadResponse = await request(app.getHttpServer())
      .post('/api/v1/documents/me/upload')
      .set('Authorization', `Bearer ${providerToken}`)
      .field('type', 'id_card')
      .attach('files', Buffer.from('%PDF-1.4 test'), {
        filename: 'id-card.pdf',
        contentType: 'application/pdf',
      })
      .attach('files', Buffer.from('fakepngbytes'), {
        filename: 'face.png',
        contentType: 'image/png',
      })
      .expect(200);

    expect(uploadResponse.body.success).toBe(true);
    expect(uploadResponse.body.data.uploadedCount).toBe(2);
    expect(uploadResponse.body.data.providerValidationStatus).toBe(
      ProviderValidationStatus.PENDING,
    );

    const provider = await userRepository.findOne({ where: { email: providerEmail } });
    expect(provider).toBeDefined();
    expect(provider?.providerValidationStatus).toBe(ProviderValidationStatus.PENDING);

    const pendingDocs = await documentRepository.find({
      where: { provider: { id: provider?.id }, isApproved: IsNull() },
      relations: { provider: true },
    });
    expect(pendingDocs).toHaveLength(2);
  });

  it('admin approves pending provider documents and provider becomes validated', async () => {
    const providerEmail = 'provider.approve@example.com';
    const providerToken = await registerVerifyAndLoginUser({
      name: 'Provider Approve',
      email: providerEmail,
      phoneNumber: '+21650000112',
      password: 'StrongP@ss1',
      dateOfBirth: '1994-08-18',
      address: 'Sfax',
      isProvider: true,
    });

    await request(app.getHttpServer())
      .post('/api/v1/documents/me/upload')
      .set('Authorization', `Bearer ${providerToken}`)
      .field('type', 'license')
      .attach('files', Buffer.from('%PDF-1.4 test'), {
        filename: 'license.pdf',
        contentType: 'application/pdf',
      })
      .expect(200);

    const adminEmail = 'admin.docs@example.com';
    const adminToken = await registerVerifyAndLoginUser(
      {
        name: 'Admin Reviewer',
        email: adminEmail,
        phoneNumber: '+21650000113',
        password: 'StrongP@ss1',
        dateOfBirth: '1990-01-01',
        address: 'Sousse',
        isProvider: false,
      },
      true,
    );

    const provider = await userRepository.findOne({ where: { email: providerEmail } });
    expect(provider).toBeDefined();

    const pendingResponse = await request(app.getHttpServer())
      .get('/api/v1/documents/admin/pending')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(pendingResponse.body.success).toBe(true);
    expect(Array.isArray(pendingResponse.body.data)).toBe(true);
    expect(pendingResponse.body.data.length).toBeGreaterThan(0);

    const reviewResponse = await request(app.getHttpServer())
      .patch(`/api/v1/documents/admin/providers/${provider?.id}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'approved' })
      .expect(200);

    expect(reviewResponse.body.success).toBe(true);
    expect(reviewResponse.body.data.providerValidationStatus).toBe(
      ProviderValidationStatus.VALIDATED,
    );

    const providerAfterReview = await userRepository.findOne({
      where: { id: provider?.id },
    });
    expect(providerAfterReview?.providerValidationStatus).toBe(
      ProviderValidationStatus.VALIDATED,
    );

    const docsAfterReview = await documentRepository.find({
      where: { provider: { id: provider?.id } },
      relations: { provider: true },
    });
    expect(docsAfterReview).toHaveLength(1);
    expect(docsAfterReview[0].isApproved).toBe(true);

    const logs = await providerValidationLogRepository.find({
      where: { provider: { id: provider?.id } },
      relations: { provider: true },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0].decision).toBe('approved');
  });

  it('rejects DOCX uploads for provider verification documents', async () => {
    const providerToken = await registerVerifyAndLoginUser({
      name: 'Provider Invalid Docx',
      email: 'provider.docx@example.com',
      phoneNumber: '+21650000114',
      password: 'StrongP@ss1',
      dateOfBirth: '1991-01-01',
      address: 'Tunis',
      isProvider: true,
    });

    await request(app.getHttpServer())
      .post('/api/v1/documents/me/upload')
      .set('Authorization', `Bearer ${providerToken}`)
      .field('type', 'license')
      .attach('files', Buffer.from('fake docx bytes'), {
        filename: 'license.docx',
        contentType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      .expect(400);
  });

  it('rejects video uploads for provider verification documents', async () => {
    const providerToken = await registerVerifyAndLoginUser({
      name: 'Provider Invalid Video',
      email: 'provider.video@example.com',
      phoneNumber: '+21650000115',
      password: 'StrongP@ss1',
      dateOfBirth: '1992-03-12',
      address: 'Sfax',
      isProvider: true,
    });

    await request(app.getHttpServer())
      .post('/api/v1/documents/me/upload')
      .set('Authorization', `Bearer ${providerToken}`)
      .field('type', 'id_card')
      .attach('files', Buffer.from('fake mp4 bytes'), {
        filename: 'scan.mp4',
        contentType: 'video/mp4',
      })
      .expect(400);
  });

  async function registerVerifyAndLoginUser(
    payload: {
      name: string;
      email: string;
      phoneNumber: string;
      password: string;
      dateOfBirth: string;
      address: string;
      isProvider: boolean;
    },
    makeAdmin = false,
  ): Promise<string> {
    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(payload)
      .expect(201);

    expect(registerResponse.body.success).toBe(true);

    const verificationToken = registerResponse.body.data.verificationToken;
    expect(verificationToken).toBeDefined();

    await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({ token: verificationToken })
      .expect(201);

    if (makeAdmin) {
      const user = await userRepository.findOne({ where: { email: payload.email } });
      expect(user).toBeDefined();
      await userRepository.update({ id: user?.id }, { isAdmin: true });
    }

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        identifier: payload.email,
        password: payload.password,
      })
      .expect(201);

    expect(loginResponse.body.success).toBe(true);
    expect(loginResponse.body.data.accessToken).toBeDefined();

    return loginResponse.body.data.accessToken as string;
  }
});
